import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, VoteValue } from '../generated/prisma/client';

// Prisma 7's `prisma-client` generator has no native engine — a driver adapter
// is mandatory, exactly like PrismaService does it (src/prisma/prisma.service.ts).
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

// Realistic 42-flavoured demo content keyed by project name.
const POSTS: { project: string; title: string; content: string }[] = [
  {
    project: 'minishell',
    title: 'Segfault only when I pipe into cat — heredoc buffering?',
    content:
      'Works for every builtin, dies the moment the last command is an external binary reading stdin. Reduced it to a 12-line repro. Anyone hit this?',
  },
  {
    project: 'minishell',
    title: 'Quote parsing: state machine vs recursive split — what held up?',
    content:
      'Splitting on spaces then re-joining quoted runs was a nightmare. A tiny in_squote/in_dquote state machine over a single pass was far cleaner. Curious what you picked.',
  },
  {
    project: 'Philosophers',
    title: "The deadlock the tester won't catch: lock-ordering on your forks",
    content:
      'Everyone grabs left-then-right. Make the last philosopher grab right-then-left and the circular wait just disappears.',
  },
  {
    project: 'Philosophers',
    title: "usleep drift is eating my 'died' timing — monotonic base?",
    content:
      "gettimeofday jitters under load. Anchoring every timestamp to one reference taken at start killed my 'died 3ms late' fails.",
  },
  {
    project: 'cub3d',
    title: 'Fisheye correction, finally explained without the hand-waving',
    content:
      'Multiply the ray distance by cos(rayAngle - playerAngle). Here is the before/after and why naive Euclidean distance bends your walls.',
  },
  {
    project: 'cub3d',
    title:
      'North/south vs east/west texturing: the wall-hit side bit me for a day',
    content:
      'Track whether the DDA stepped in x or y to choose the texture and the exact hit coordinate. Sharing my side-detection snippet.',
  },
  {
    project: 'push_swap',
    title: 'Sub-3000 ops on 500 numbers: chunk sizing that actually matters',
    content:
      'Radix passed the checker but chunked insertion with ~sqrt(n) chunk size got me consistently under the bonus threshold.',
  },
  {
    project: 'ft_printf',
    title: 'Why your %-flag handling breaks on width 0 (and the fix)',
    content:
      "Width 0 with a left-flag is the edge case the moulinette loves. Handle the 'no padding needed' branch explicitly and it passes.",
  },
  {
    project: 'get_next_line',
    title: 'The static-buffer leak everyone misses at valgrind',
    content:
      'On EOF you free the stash but forget the case where the last line has no trailing newline — that path leaks. One extra free.',
  },
  {
    project: 'minitalk',
    title: 'Unicode over signals without losing bits: my ack protocol',
    content:
      "Send bit-by-bit with SIGUSR1/2, but wait for the server's ack per char or a fast sender drops bits. Timing diagram inside.",
  },
  {
    project: 'so_long',
    title: 'Flood-fill path validation before you even open a window',
    content:
      'Parse the map, flood-fill from the player, assert every collectible and the exit are reachable. Fail fast with a clean error.',
  },
  {
    project: 'Born2beroot',
    title: 'Monitoring script in pure bash: the CPU% line that fooled me',
    content:
      'top -bn1 gives a snapshot that spikes; average two reads or use /proc/stat deltas for a stable load%.',
  },
  {
    project: 'Libft',
    title: 'ft_split edge cases the tester throws at you',
    content:
      "Empty string, all-delimiters, leading/trailing delimiters. Here's the guard that passed every split tester I found.",
  },
];

// A few threads keyed by the post title above.
const THREADS: {
  post: string;
  comment: string;
  reply?: string;
}[] = [
  {
    post: 'Segfault only when I pipe into cat — heredoc buffering?',
    comment:
      "Check you're closing the write-end of the heredoc pipe in the parent — that stalls cat until EOF.",
    reply:
      'That was it. Closing the unused fd after fork fixed the hang. Thanks!',
  },
  {
    post: "The deadlock the tester won't catch: lock-ordering on your forks",
    comment:
      'Odd/even ordering works too — even philosophers take left first, odd take right first.',
  },
  {
    post: 'Fisheye correction, finally explained without the hand-waving',
    comment: 'This finally made it click — the cos factor is exactly it.',
    reply: 'Glad it helped, it tripped me up for way too long.',
  },
  {
    post: 'Sub-3000 ops on 500 numbers: chunk sizing that actually matters',
    comment: 'sqrt(n) chunks got me to ~2600 for 500. Good shout.',
  },
];

async function main() {
  const authors = await prisma.user.findMany({
    where: { ftId: { not: null } },
    select: { id: true },
  });
  if (authors.length < 2) {
    console.log('Need at least two 42 users to seed — skipping.');
    return;
  }
  const author = (i: number) => authors[i % authors.length].id;

  const projects = await prisma.projects.findMany({
    where: { name: { in: [...new Set(POSTS.map((p) => p.project))] } },
    select: { id: true, name: true },
  });
  const projectId = new Map(projects.map((p) => [p.name, p.id]));

  // Clean slate: drop existing forum content (keeps users, groups, projects).
  await prisma.chatVote.deleteMany({});
  await prisma.postVote.deleteMany({});
  await prisma.projectsChat.deleteMany({});
  await prisma.projectsPost.deleteMany({});

  const postId = new Map<string, string>();
  let i = 0;
  for (const p of POSTS) {
    const pid = projectId.get(p.project);
    if (!pid) continue;
    const created = await prisma.projectsPost.create({
      data: {
        projectId: pid,
        writer: author(i),
        title: p.title,
        content: p.content,
        filesUrl: [],
      },
    });
    postId.set(p.title, created.id);

    // Upvotes from other authors so scores look alive.
    for (let v = 1; v <= Math.min(authors.length - 1, 2 + (i % 2)); v++) {
      await prisma.postVote.create({
        data: { userId: author(i + v), postId: created.id, vote: VoteValue.UP },
      });
    }
    i++;
  }

  let j = 0;
  for (const th of THREADS) {
    const pid = postId.get(th.post);
    if (!pid) continue;
    const comment = await prisma.projectsChat.create({
      data: {
        answeringPost: pid,
        writer: author(j + 1),
        content: th.comment,
        filesUrl: [],
      },
    });
    if (th.reply) {
      await prisma.projectsChat.create({
        data: {
          answeringChat: comment.id,
          writer: author(j),
          content: th.reply,
          filesUrl: [],
        },
      });
    }
    j++;
  }

  console.log(
    `Seeded ${postId.size} posts and ${THREADS.length} threads across ${projects.length} projects.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
