import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { FtTokenResponse, FtProfile, FtProject, FtTeam } from './ftapi.types';
import { fetchWithRetry } from 'src/utils/http';

// The 42 API has no "project kind" flag: real projects, exams, piscine modules,
// admin entries and duplicates all share cursus 21. So we keep only top-level
// non-exam entries and match two slug allow-lists (core / specialization); a
// deny-list is impossible since the junk set is open-ended. Anything unmatched
// stays untagged and is filtered out of GET /projects.
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

// 42 outer-circle specialization projects; verified against the live cursus-21 API (2026-07): real specialties only.
const SPECIALIZATION_SLUGS = new Set<string>([
  // Graphics
  '42cursus-scop',
  '42cursus-rt',
  '42cursus-humangl',
  '42cursus-particle-system',
  '42cursus-shaderpixel',
  '42cursus-gbmu',
  '42cursus-ft_vox',
  '42cursus-bomberman',
  '42cursus-nibbler',
  '42cursus-doom-nukem',
  '42cursus-mod1',
  '42cursus-guimp',
  '42cursus-42run',
  '42cursus-rubik',
  // Algorithms & AI
  '42cursus-gomoku',
  '42cursus-n-puzzle',
  '42cursus-expert-system',
  '42cursus-krpsim',
  '42cursus-computorv1',
  '42cursus-computorv2',
  '42cursus-ft_linear_regression',
  '42cursus-multilayer-perceptron',
  '42cursus-total-perspective-vortex',
  '42cursus-dslr',
  'matrix',
  'ft_kalman',
  'ready-set-boole',
  'leaffliction',
  'learn2slither',
  // Web & Mobile
  '42cursus-camagru',
  '42cursus-matcha',
  '42cursus-hypertube',
  '42cursus-red-tetris',
  '42cursus-h42n42',
  '42cursus-music-room',
  '42cursus-ft_hangouts',
  '42cursus-swifty-companion',
  '42cursus-swifty-proteins',
  // Kernel, Unix & low-level
  '42cursus-little-penguin-1',
  '42cursus-kfs-1',
  '42cursus-kfs-2',
  '42cursus-kfs-3',
  '42cursus-kfs-4',
  '42cursus-kfs-5',
  '42cursus-kfs-6',
  '42cursus-kfs-7',
  '42cursus-kfs-8',
  '42cursus-kfs-9',
  '42cursus-kfs-x',
  '42cursus-ft_linux',
  '42cursus-drivers-and-interrupts',
  '42cursus-process-and-memory',
  '42cursus-filesystem',
  '42cursus-userspace_digressions',
  '42cursus-lem-ipc',
  '42cursus-taskmaster',
  '42cursus-matt-daemon',
  '42cursus-messagequeue',
  '42cursus-malloc',
  '42cursus-strace',
  '42cursus-ft_ls',
  '42cursus-ft_select',
  '42cursus-ft_script',
  '42cursus-42sh',
  'nm',
  'libasm',
  'libftpp',
  // Networks & sysadmin
  '42cursus-ft_nmap',
  '42cursus-ft_ping',
  '42cursus-ft_traceroute',
  '42cursus-cloud-1',
  'inception-of-things',
  'ft_iac',
  // Security
  '42cursus-snow-crash',
  '42cursus-override',
  '42cursus-rainfall',
  '42cursus-boot2root',
  '42cursus-ft_shield',
  '42cursus-ft_ssl_md5',
  '42cursus-ft_ssl_rsa',
  '42cursus-ft_ssl_des',
  '42cursus-woody-woodpacker',
  '42cursus-dr-quine',
  '42cursus-famine',
  '42cursus-pestilence',
  '42cursus-war',
  '42cursus-death',
  '42cursus-darkly',
  'ft_malcolm',
  // Compilation, languages & misc
  '42cursus-corewar',
  '42cursus-abstract-vm',
  '42cursus-avaj-launcher',
  '42cursus-swingy',
  '42cursus-ft_ality',
  '42cursus-ft_turing',
  '42cursus-xv',
  '42cursus-in-the-shadows',
  '42cursus-zappy',
  '42cursus-lem_in',
  'ft_lex',
  'ft_yacc',
  // Blockchain & quantum
  'tokenizer',
  'tokenizeart',
  'ftl_quantum',
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

  // Walk the 42cursus (id 21) projects, keep top-level non-exam entries and tag
  // each allow-listed slug 'core' | 'specialization'; the rest stays untagged.
  async syncAllProjects() {
    let page = 1;
    while (true) {
      const projects = await this.Get<FtProject[]>(
        `v2/cursus/${COMMON_CORE_CURSUS_ID}/projects?page[size]=100&page[number]=${page}`,
      );

      for (const project of projects) {
        // Only top-level, non-exam entries are real projects (exams and piscine sub-modules carry a parent).
        if (project.parent != null || project.exam === true) continue;

        const category = COMMON_CORE_SLUGS.has(project.slug)
          ? 'core'
          : SPECIALIZATION_SLUGS.has(project.slug)
            ? 'specialization'
            : null;
        if (category === null) continue;

        await this.prisma.projects.upsert({
          where: { id: String(project.id) },
          update: { name: project.name, category },
          create: {
            id: String(project.id),
            name: project.name,
            category,
          },
        });
      }

      if (projects.length < 100) break;
      page++;
    }
  }
}
