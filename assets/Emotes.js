// ========================================================================== //
global.loadedModules.modules.push({
	name:"Emotes",
	version: "1.0"
});
// ========================================================================== //

module.exports = {
	GetId: emote => emote.replace(/[^0-9]/gi, ''),
	GetName: emote => emote.split(':')[1],
	IsAnimated: emote => /<a:.*:[0-9]*>/gi.test(emote),
	GetEmojiObject: emote => Object({
		name: emote.split(':')[1],
		id: emote.replace(/[^0-9]/gi, ''),
		animated: /<a:.*:[0-9]*>/gi.test(emote),
	}),

	downvote: "<:downvote:1336729524913831946>",
	upvote: "<:upvote:1336729498015633580>",
	
	progress: {
		blue: {
			start: {
				empty: '<:bl_s_0:686562608962076825>',
				partial: '<:bl_s_1:686562612212924432>',
				full: '<:bl_s_2:686562613479473160>',
			},
			middle: {
				empty: '<:bl_m_0:686562604046614544>',
				partial: '<:bl_m_1:686562606495825941>',
				full: '<:bl_m_2:686562607410184227>',
			},
			end: {
				empty: '<:bl_e_0:686562594038874124>',
				partial: '<:bl_e_1:686562601735421982>',
				full: '<:bl_e_2:686562603082055814>',
			}
		},
		brown: {
			start: {
				empty: '<:br_s_0:686562855453196338>',
				partial: '<:br_s_1:686562858930274348>',
				full: '<:br_s_2:686562859328864292>',
			},
			middle: {
				empty: '<:br_m_0:686562852282040324>',
				partial: '<:br_m_1:686562852160798742>',
				full: '<:br_m_2:686562853310038058>',
			},
			end: {
				empty: '<:br_e_0:686562843343978553>',
				partial: '<:br_e_1:686562846150361112>',
				full: '<:br_e_2:686562851141582936>',
			}
		},
		green: {
			start: {
				empty: '<:gr_s_0:686557005678510080>',
				partial: '<:gr_s_1:686557005837893656>',
				full: '<:gr_s_2:686557005909196855>',
			},
			middle: {
				empty: '<:gr_m_0:686557005007290437>',
				partial: '<:gr_m_1:686557005846020136>',
				full: '<:gr_m_2:686557005309411344>',
			},
			end: {
				empty: '<:gr_e_0:686557004596248616>',
				partial: '<:gr_e_1:686557005384908831>',
				full: '<:gr_e_2:686557005158285369>',
			}
		},
		yellow: {
			start: {
				empty: '<:ja_s_0:686562988076826660>',
				partial: '<:ja_s_1:686562989985628247>',
				full: '<:ja_s_2:686562990857912331>',
			},
			middle: {
				empty: '<:ja_m_0:686562987217387530>',
				partial: '<:ja_m_1:686562988047728640>',
				full: '<:ja_m_2:686562987720704014>',
			},
			end: {
				empty: '<:ja_e_0:686562975317884933>',
				partial: '<:ja_e_1:686562983324680441>',
				full: '<:ja_e_2:686562984469856284>',
			}
		},
	},

	WolphieDaWei:"<:WolphieDaWei:1013255998615597068>",
	Awesome_Troll_Face:"<:Awesome_Troll_Face:1013257043727102002>",
	Booster:"<a:booster:1070406359432040498>",
	
	Other: {
		Kappa:"<:Kappa:779889519469920276>"
	},
	Checkbox: {
		On:"<:checkbox_on:809087948401279007>",
		Off:"<:checkbox_off:809087947764137985>"
	},
	checkmark: "<:checkmark:667503703485579284>",
	crossmark: "<:crossmark:667503733105623080>",
	loading: "<a:loading:950190053978685491>",
	
	cancel: "<:cancel:1316780171906252810>",
	checked: "<:checked:1316780169872281680>",

	gray_cancel: "<:gray_cancel:1317926771441795246>",
	gray_checked: "<:gray_checked:1317926773152944138>",
	
	black_cancel: "<:black_cancel:1317927608142401556>",
	black_checked: "<:black_checked:1317927606800351242>",
	
	white_cancel: "<:white_cancel:1317927708197523558>",
	white_checked: "<:white_checked:1317927706221875340>",

	empty: "<:empty:1317690674195202130>",

	compass: {
		black: "<:black_compass:1002593879394103388>",
		white: "<:white_compass:1002593877594738718>",
	},

	command_icon: {
		slash: {
			black: "<:slash_command:1002685839710638220>",
			white: "<:white_slash_command:1002685837584105482>",
		},
		chat: {
			black: "<:chat_command:1002685834916528148>",
			white: "<:white_chat_command:1002685832110555177>",
		},
		hybrid: {
			black: "<:hybrid_command:1002687310376218674>",
			white: "<:white_hybrid_command:1002687307033354302>",
		},
	},



	icons: {
		black: {
			add_user: "<:add_user:1090692854931796170>",
			remove_user: "<:remove_user:1090692859864293547>",
			add_role: "<:add_role:1090692857154768958>",
			remove_role: "<:remove_role:1090692858442416198>"
		},
		white: {
			add_user: "<:add_user:1090693194343260252>",
			remove_user: "<:remove_user:1090693197690318908>",
			add_role: "<:add_role:1090693196251668490>",
			remove_role: "<:remove_role:1090693193084969020>"
		}
	},


	chevron: {
		black: {
			left: {
				simple: "<:left_chevron:1002585965828788246>",
				double: "<:double_left_chevron:1002585962704031744>",
				triple: "<:triple_left_chevron:1002585964000067615>",
			},
			right: {
				simple: "<:right_chevron:1002585967405838426>",
				double: "<:double_right_chevron:1002585970488647680>",
				triple: "<:triple_right_chevron:1002585969033232424>",
			},
		},
		white: {
			left: {
				simple: "<:left_white_chevron:1002586854832484393>",
				double: "<:double_left_white_chevron:1002586856757669928>",
				triple: "<:triple_left_white_chevron:1002586858326331402>",
			},
			right: {
				simple: "<:right_white_chevron:1002586853754536066>",
				double: "<:double_right_white_chevron:1002586852286533731>",
				triple: "<:triple_right_white_chevron:1002586850663338014>",
			},
		}
	},

	pshitpshit: "<:pshitpshit:1318634963918258317>",
}