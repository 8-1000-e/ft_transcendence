import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { FtApiService } from 'src/ftapi/ftapi.services';
import { FtLocation, FtProjectUser, SuggestedUser } from './suggest.types';
import { PrismaService } from 'src/prisma/prisma.service';

type FtApiRequestCounter = {
  locations: number;
  projectsUsers: number;
};

// Cap the live-42 location lookups the mentor rail resolves (avoids the nginx 504).
const MAX_SUGGESTIONS = 12;

@Injectable()
export class SuggestService {
  constructor(
    private readonly ftApiService: FtApiService,
    private readonly prisma: PrismaService,
  ) {}

  // Mentor-matching using the logged-in user's own campus; empty list if none resolved.
  async getSuggestForMe(
    projectId: string,
    userId: string,
  ): Promise<SuggestedUser[]> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.ftId) {
      throw new ForbiddenException('42 account required to access suggestions');
    }
    if (!user.campusId) return [];
    return this.getSuggestByProject(projectId, user.campusId, userId);
  }

  async getSuggestByProject(
    projectId: string,
    campusId: string,
    userId: string,
  ): Promise<SuggestedUser[]> {
    try {
      const requestCounter: FtApiRequestCounter = {
        locations: 0,
        projectsUsers: 0,
      };
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.ftId) {
        throw new ForbiddenException(
          '42 account required to access suggestions',
        );
      }

      const projectUsers = await this.takeUsers(
        projectId,
        campusId,
        requestCounter,
      );
      // Never suggest the logged-in user to themselves (match on ftId or login).
      const validatedProjectsUsers = projectUsers
        .filter((projectUser) => projectUser['validated?'] === true)
        .filter(
          (projectUser) =>
            String(projectUser.user.id) !== user.ftId &&
            projectUser.user.login !== user.login,
        )
        .sort((a, b) => {
          const markDiff = (b.final_mark ?? -1) - (a.final_mark ?? -1);
          if (markDiff !== 0) return markDiff;

          return (
            Date.parse(b.marked_at ?? '0') - Date.parse(a.marked_at ?? '0')
          );
        });

      const projectsByTeam = new Map<string, FtProjectUser[]>();

      for (const projectUser of validatedProjectsUsers) {
        const teamId = String(
          projectUser.current_team_id ?? projectUser.user.id,
        );
        const teamUsers = projectsByTeam.get(teamId) ?? [];

        teamUsers.push(projectUser);
        projectsByTeam.set(teamId, teamUsers);
      }
      const test = Array.from(projectsByTeam.entries()).map(
        ([teamId, teamUsers]) => {
          const bestProjectUser = teamUsers[0];

          return {
            id: teamId,
            isGroupe: teamUsers.length > 1,
            final_mark: bestProjectUser.final_mark,
            marked_at: bestProjectUser.marked_at,
            users: teamUsers.map((projectUser) => ({
              id: String(projectUser.user.id),
              login: projectUser.user.login,
              name:
                projectUser.user.usual_full_name ??
                projectUser.user.displayname ??
                null,
              ppurl: projectUser.user.image?.link ?? null,
              last_connexion: null,
              location: null,
            })),
          };
        },
      );
      // Resolve locations only for the top few shown — one `locations` call
      // instead of the O(users) loop that was timing out (nginx 504).
      const topTeams = test.slice(0, MAX_SUGGESTIONS);
      const suggestions = await this.checkLocations(
        topTeams,
        campusId,
        requestCounter,
      );
      return suggestions;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;

      throw new InternalServerErrorException('Unable to load suggestions');
    }
  }

  private async takeUsers(
    projectId: string,
    campusId: string,
    requestCounter: FtApiRequestCounter,
  ): Promise<FtProjectUser[]> {
    const now = new Date();
    const xMonthsAgo = new Date(now);
    let monthsBack = 2;
    xMonthsAgo.setMonth(xMonthsAgo.getMonth() - monthsBack);

    const query = new URLSearchParams({
      'filter[status]': 'finished',
      'range[final_mark]': '100,125',
      'range[marked_at]': `${xMonthsAgo.toISOString()},${now.toISOString()}`,
      sort: '-final_mark,-marked_at',
      'page[size]': '100',
      'page[number]': '1',
    });

    if (campusId) query.set('filter[campus]', campusId);

    const usersProject: FtProjectUser[] = [];
    while (true) {
      const users = await this.ftApiService.Get<FtProjectUser[]>(
        `v2/projects/${projectId}/projects_users?${query.toString()}`,
      );
      requestCounter.projectsUsers++;

      if (users.length == 0 && monthsBack < 10) {
        xMonthsAgo.setMonth(xMonthsAgo.getMonth() - 1);
        monthsBack++;
        query.set(
          'range[marked_at]',
          `${xMonthsAgo.toISOString()},${now.toISOString()}`,
        );
        continue;
      }
      // Page 1 (sorted by -final_mark) holds the top 100 — enough for the rail,
      // and avoids walking extra rate-limited pages.
      usersProject.push(...users);
      break;
    }
    return usersProject;
  }
  private async checkLocations(
    projectUsers: SuggestedUser[],
    campusId: string,
    requestCounter: FtApiRequestCounter,
  ): Promise<SuggestedUser[]> {
    if (!campusId) return projectUsers;

    const userIds = new Set(
      projectUsers
        .flatMap((projectUser) => projectUser.users)
        .map((user) => user.id),
    );

    if (userIds.size === 0) return projectUsers;

    const query = new URLSearchParams({
      //   'filter[active]': 'true',
      'page[size]': '100',
      'page[number]': '1',
      sort: '-begin_at',
    });
    const lastLocationByUserId = new Map<string, FtLocation>();
    while (userIds.size > 0) {
      query.set('filter[user_id]', Array.from(userIds).join(','));

      const locations = await this.ftApiService.Get<FtLocation[]>(
        `v2/campus/${campusId}/locations?${query.toString()}`,
      );
      requestCounter.locations++;

      if (locations.length === 0) break;

      for (const location of locations) {
        const userId = String(location.user.id);
        if (!lastLocationByUserId.has(userId)) {
          lastLocationByUserId.set(userId, location);
          userIds.delete(userId);
        }
      }
    }

    for (const suggestion of projectUsers) {
      for (const user of suggestion.users) {
        const location = lastLocationByUserId.get(user.id);
        if (!location) {
          user.location = null;
          user.last_connexion = null;
          continue;
        }
        if (location.end_at == null) {
          user.location = location.host;
          user.last_connexion = location.begin_at;
        } else {
          user.location = null;
          user.last_connexion = location.end_at;
        }
      }
    }

    return projectUsers;
  }
}
