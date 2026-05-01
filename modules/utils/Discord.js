import { Registry } from '#modules/Registry';
import { ChannelType, PermissionFlagsBits } from 'discord.js';

import { noop } from "#modules/Utils";

// MARK: Register Module
Registry.register({
  name: "Discord Utils",
  group: "utils",
  version: "2.1",
  details: [
    "ResolveMember",
    "IsMessageAuthorAdmin",
  ]
});

// MARK: ResolveMember
export async function ResolveMember(guild, query) {
  if (!query || !guild) return null;

  
  const mentionMatch = query.match(/^<@&?!?(\d+)>$/);
  const searchId = mentionMatch ? mentionMatch[1] : query;

  // Try to get by id (with 10s timeout)
	const member = await Promise.race([
		guild.members.fetch({ user: searchId, force: false }),
		new Promise((_, reject) => 
			setTimeout(() => reject(new Error("Timeout")), 10000)
		),
	]).catch(noop);
	if (member) return member;


  const foundMembers = await guild.members.fetch({ query, limit: 1 });
  const firstFound = foundMembers.first();

  if (firstFound) return firstFound;

  const lowercased = query.toLowerCase().simplify();

  // 4. Fallback sur le cache pour la recherche partielle personnalisée (.simplify)
  return guild.members.cache.find(m => {
    const nickname = m.nickname?.toLowerCase().simplify().includes(lowercased);
    const username = m.user.username.toLowerCase().simplify().includes(lowercased);
    const displayName = m.displayName.toLowerCase().simplify().includes(lowercased);

    return nickname || username || displayName;
  }) || null;
}


// MARK: IsMessageAuthorAdmin
export function IsMessageAuthorAdmin(element) {
  if (element.channel.type == ChannelType.DM) return false;
  return element.member.permissions.has(PermissionFlagsBits.Administrator);
}
