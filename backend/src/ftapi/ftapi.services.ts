import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { FtTokenResponse, FtProfile, FtProject, FtTeam } from './ftapi.types';
import { fetchWithRetry } from 'src/utils/http';

// The 42 API has no "common core" boolean: every project — common core, outer
// circle, CPP/exam/piscine modules, old duplicates and fakes — lives under the
// same cursus. The clean discriminator is therefore two-fold:
//   1. cursus 21 ("42cursus", kind "main") — the main student cursus, and
//   2. an explicit allow-list of the canonical common-core project slugs.
// Slugs (not names/ids) are matched because they are stable and unambiguous;
// the exact slugs below were resolved against the live API to avoid the many
// near-duplicates (old-*, 42adv-*, 42next-*, uuid-suffixed, cub3d dup, etc.).
const COMMON_CORE_CURSUS_ID = 21;
const COMMON_CORE_SLUGS = new Set<string>([
  '42cursus-libft',
  '42cursus-ft_printf',
  'born2beroot',
  '42cursus-get_next_line',
  'pipex',
  'minitalk',
  'so_long',
  '42cursus-fdf',
  '42cursus-fract-ol',
  '42cursus-push_swap',
  '42cursus-minishell',
  '42cursus-philosophers',
  'cub3d',
  'minirt',
  'netpractice',
  'ft_irc',
  'inception',
  'webserv',
  'ft_transcendence',
  'cpp-module-00',
  'cpp-module-01',
  'cpp-module-02',
  'cpp-module-03',
  'cpp-module-04',
  'cpp-module-05',
  'cpp-module-06',
  'cpp-module-07',
  'cpp-module-08',
  'cpp-module-09',
]);

@Injectable()
export class FtApiService {
  private appToken: string | null = null;
  private appTokenExpiresAt: number = 0;
  private projectNameCache = new Map<string, string>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private async getAppToken(): Promise<string> {
    if (this.appToken && Date.now() < this.appTokenExpiresAt)
      return this.appToken;

    const res = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.getOrThrow('FT_OAUTH_CLIENT_ID'),
        client_secret: this.config.getOrThrow('FT_OAUTH_CLIENT_SECRET'),
      }),
    });
    const data = (await res.json()) as FtTokenResponse;
    if (!res.ok || !data.access_token) {
      throw new UnauthorizedException('42 token exchange failed');
    }
    const token = data.access_token;
    this.appToken = token;
    this.appTokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return token;
  }

  async getProfileFromCode(code: string): Promise<FtProfile> {
    const res = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.getOrThrow('FT_OAUTH_CLIENT_ID'),
        client_secret: this.config.getOrThrow('FT_OAUTH_CLIENT_SECRET'),
        code,
        redirect_uri: this.config.getOrThrow('FT_OAUTH_REDIRECT_URI'),
      }),
    });
    const data = (await res.json()) as FtTokenResponse & {
      error?: string;
      error_description?: string;
    };
    if (!res.ok || !data.access_token) {
      throw new UnauthorizedException({
        message: '42 token exchange failed',
        status: res.status,
        ftError: data.error,
        ftErrorDescription: data.error_description,
      });
    }
    const resl = await this.Get<FtProfile>(`v2/me`, data.access_token);
    return resl;
  }

  private async getProjectName(projectId: string): Promise<string> {
    const cached = this.projectNameCache.get(projectId);
    if (cached) return cached;

    const project = await this.Get<FtProject>(`v2/projects/${projectId}`);
    const name = project.name;
    this.projectNameCache.set(projectId, name);
    return name;
  }

  async Get<T>(path: string, userToken?: string): Promise<T> {
    const token = userToken ?? (await this.getAppToken());
    const res = await fetchWithRetry(`https://api.intra.42.fr/${path}`, token);
    if (!res.ok)
      throw new Error(`42 API request failed with status ${res.status}`);
    return (await res.json()) as T;
  }

  async syncUserTeam(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.ftId) return;

    let page = 1;
    while (true) {
      const teams = await this.Get<FtTeam[]>(
        `v2/users/${user.ftId}/teams?page[size]=100&page[number]=${page}`,
      );
      for (const team of teams) {
        const memberFtIds = team.users.map((u) => String(u.id));
        if (memberFtIds.length === 1 || team['validated?'] === false) continue;

        const projectName = await this.getProjectName(String(team.project_id));

        await this.prisma.projectGroup.upsert({
          where: { id: String(team.id) },
          update: { usersId: memberFtIds, projectName },
          create: {
            id: String(team.id),
            groupName: team.name,
            groupCampus: user.campus,
            projectId: String(team.project_id),
            projectName,
            usersId: memberFtIds,
          },
        });
      }

      if (teams.length < 100) break;
      page++;
    }
  }

  // Sync only the 42 common-core projects (see COMMON_CORE_SLUGS above).
  // Walks the 42cursus (id 21) projects and flags the allow-listed ones with
  // isCommonCore = true. Non-core rows created by earlier syncs are left as-is
  // (isCommonCore defaults to false) and are filtered out of GET /projects.
  async syncAllProjects() {
    let page = 1;
    while (true) {
      const projects = await this.Get<FtProject[]>(
        `v2/cursus/${COMMON_CORE_CURSUS_ID}/projects?page[size]=100&page[number]=${page}`,
      );

      for (const project of projects) {
        if (!COMMON_CORE_SLUGS.has(project.slug)) continue;

        await this.prisma.projects.upsert({
          where: { id: String(project.id) },
          update: { name: project.name, isCommonCore: true },
          create: {
            id: String(project.id),
            name: project.name,
            isCommonCore: true,
          },
        });
      }

      if (projects.length < 100) break;
      page++;
    }
  }
}
