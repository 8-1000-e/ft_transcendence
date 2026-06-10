import { randomBytes } from 'crypto';
import { RdmProfile } from './anon.types';

interface RandomUserResponse {
  results: {
    name: { first: string; last: string };
    picture: { thumbnail: string };
    location: { city: string };
  }[];
}

export async function randomIdentity(): Promise<RdmProfile> {
  try {
    const res = await fetch('https://randomuser.me/api/');
    if (!res.ok) throw new Error('randomuser.me request failed');

    const data = (await res.json()) as RandomUserResponse;
    const user = data.results[0];
    return {
      name: `${user.name.first} ${user.name.last}`,
      pfp: user.picture.thumbnail,
      city: user.location.city,
    };
  } catch {
    const seed = randomBytes(6).toString('hex');
    return {
      name: `ft_user${seed.slice(0, 4)}`,
      pfp: `https://api.dicebear.com/9.x/identicon/svg?seed=${seed}`,
      city: 'Unknown',
    };
  }
}
