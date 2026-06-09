import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  FtTokenResponse,
  FtProfile,
  FtProject,
  FtTeam,
  FtCursus,
} from './ftapi.types';
import { fetchWithRetry } from 'src/utils/http';

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
    const data = (await res.json()) as FtTokenResponse;
    return this.Get<FtProfile>(`v2/me`, data.access_token);
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

  private async getCursesIds(): Promise<FtCursus[]> {
    return this.Get<FtCursus[]>('v2/cursus?page[size]=100');
  }

  async syncAllProjects() {
    const cursusList = await this.getCursesIds();

    for (const cursus of cursusList) {
      let page = 1;
      while (true) {
        const projects = await this.Get<FtProject[]>(
          `v2/cursus/${cursus.id}/projects?page[size]=100&page[number]=${page}`,
        );

        for (const project of projects) {
          await this.prisma.projects.upsert({
            where: { id: String(project.id) },
            update: { name: project.name },
            create: {
              id: String(project.id),
              name: project.name,
            },
          });
        }

        if (projects.length < 100) break;
        page++;
      }
    }
  }
}
