"use strict";

function sandwich(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "miam":
			if(Math.random() < 0.1)
			{
				update(l.Venture.sandwich_poison, null);
				reinitialise("prepare");
				return;
			}
			else
				texte = l.Venture.sandwich_nom;
			break;
		case "detruire":
			texte = l.Venture.sandwich_detruit;
			break;
		case "donner":
			texte = l.Venture.sandwich_pangolin;
			break;
	}

	texte = [...texte, l.Venture.sandwich_whatNow];
	suite = [[l.Venture.foret_marche, "foret", "marche"],
			[l.Venture.foret_grimpe, "foret", "grimpe"],
			[l.Venture.foret_trou, "foret", "trou"]];

	update(texte, suite);
}

function foret(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "marche":
			texte = l.Venture.foret_vieux;
			suite = [[l.Venture.vieux_tmr, "roi", "tamere"],
					[l.Venture.vieux_nan, "roi", "nan"],
					[l.Venture.vieux_nowel, "roi", "nan"],
					[l.Venture.vieux_chepas, "roi", "chaispas"]];
			break;
		case "grimpe":
			texte = l.Venture.foret_elfe;
			suite = [[l.Venture.elfe_blondiniste, "elfe", "pretre"],
					[l.Venture.elfe_scout, "elfe", "scout"],
					[l.Venture.elfe_fan, "elfe", "fan"],
					[l.Venture.elfe_chepas, "elfe", "chaispas"]];
			break;
		case "trou":
			texte = l.Venture.foret_nain;
			suite = [[l.Venture.nain_gargamel, "nain", "gargamel"],
					[l.Venture.nain_geant, "nain", "nain"],
					[l.Venture.nain_chepas, "nain", "chaispas"]];
			break;
	}

	update(texte, suite);
}


function roi(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "tamere":
			texte = [...lr.tmr,  reinitialise("mort")];
			break;
		case "nan":
			texte = [...lr.nowel, reinitialise("mort")];
			break;
		case "chaispas":
			texte = lr.chepas;
			suite = [[lr.proposition_merci, "debile", "dac"],
					[lr.proposition_mauvaisPere, "roi", "nan"],
					[lr.proposition____, "debile", "..."]];
			break;
	}

	update(texte, suite);
}

function debile(choix)
{
	let texte = choix === "dac" ? [lr.debile_yes] : [lr.debile_silence], suite;

	texte.push(lr.duel);

	suite = [[lr.duel_vosGueules, "duel", "laferme"],
			[lr.duel_tete, "duel", "tete"],
			[lr.duel_torse, "duel", "corps"]];

	update(texte, suite);
}

function duel(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "laferme":
			texte = lr.publicHue;
			suite = [[lr.duel_tete, "duel", "tete"],
					[lr.duel_torse, "duel", "corps"]];
			break;
		case "tete":
		case "corps":
			texte = choix === "tete" ? [lr.duel_victoire_tete] : [lr.duel_victoire_torse];
			texte[0] += lr.duel_victoire_suite;
			texte.push(lr.duel_festin);
			suite = [[lr.quete_dragon, "queteDragon"],
					[lr.quete_collier, "queteCollier"],
					[lr.quete_miroir, "queteMiroir"]];
			break;
	}

	update(texte, suite);
}



function queteDragon()
{
	let texte, suite;

	texte = l.roi.dragon.debut;

	suite = [[l.roi.dragon.chuisPerdu, "dragon", "carte"],
			[l.roi.dragon.offrande, "dragon", "cheval"],
			[l.roi.dragon.attaque, "combatDragon", "epee"]];

	update(texte, suite);
}

function dragon(choix)
{
	let texte = "", suite;

	switch(choix)
	{
		case "carte":
			texte = l.roi.dragon.chuisPerdu_sympa;
			suite = [[l.roi.dragon.chuisPerdu_merci, "dragon", "emmene"],
					[l.roi.dragon.chuisPerdu_cheval, "dragon", "emmeneCheval"],
					[l.roi.dragon.chuisPerdu_attaque, "combatDragon", "carte"]];
			break;
		case "cheval":
			texte = l.roi.dragon.offrande_nonMerci;
			suite = [[l.roi.dragon.courses_aide, "copainDragon", "first"],
					[l.roi.dragon.courses_attaque, "combatDragon", "enfoire"]];
			break;

		case "emmeneCheval":
			texte = l.roi.dragon.taxi_cheval;
		case "emmene":
			texte += l.roi.dragon.taxi;
			suite = [[l.roi.dragon.taxi_enFait, "dragon", "explique"],
					[l.roi.dragon.taxi_merci, "newQuest", "zetesCon"]];
			break;
		case "explique":
			texte = l.roi.dragon.taxi_mince;
			suite = [[l.roi.dragon.taxi_citeRoyale, "newQuest", "ramene"],
					[l.roi.dragon.taxi_baston, "combatDragon", "retour"]];
			break;
	}

	update(texte, suite);
}

function copainDragon(first)
{
	let texte, suite;

	texte = first === "first" ? l.roi.dragon.courses : l.roi.dragon.sirote;
	suite = [[l.roi.dragon.sirote, "copainDragon", "pasFirst"],
			[l.roi.dragon.sirote_attaque, "combatDragon", "the"],
			[l.roi.dragon.sirote_autreQuete, "newQuest", "dragon"]];

	update(texte, suite);
}

function newQuest(pourquoi)
{
	let texte, suite;

	switch(pourquoi)
	{
		case "dragon":
			texte = [l.roi.dragon.autreQuete_sirotait];
			break;
		case "zetesCon":
			texte = [l.roi.dragon.autreQuete_taxi];
			break;
		case "ramene":
			texte = [l.roi.dragon.autreQuete_taxi_taxi];
			break;
	}
	texte.push(l.roi.dragon.autreQuete);
	suite = [[l.roi.dragon.autreQuete_collier, "queteCollier"],
			[l.roi.dragon.autreQuete_miroir, "queteMiroir"]];

	update(texte, suite);
}

function combatDragon(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "epee":
		case "carte":
		case "retour":
			switch(choix)
			{
				case "epee":
					texte = l.roi.dragon.baston_menace;
					break;
				case "carte":
					texte = l.roi.dragon.baston_jetaisPerdu;
					break;
				case "retour":
					texte = l.roi.dragon.baston_taxi;
					break;
			}
			suite = [[l.roi.dragon.baston_CHAAARGE, "combatDragon2", "fullFace"],
					[l.roi.dragon.baston_escalade, "combatDragon2", "escalade"],
					[l.roi.dragon.baston_talons, "combatDragon2", "pattes"],
					[l.roi.dragon.baston_bouclier, "combatDragon2", "bouclier"]];
			break;
		case "enfoire":
		case "the":
			texte = [l.roi.dragon.baston_theiere, reinitialise("mort")];
			break;
	}

	update(texte, suite);
}

function combatDragon2(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "fullFace":
			texte = [l.roi.dragon.baston_smorc, reinitialise("mort")];
			break;
		case "escalade":
		case "accrocher":
			texte = choix === "escalade" ? l.roi.dragon.escalade : l.roi.dragon.escalade_statusQuo;
			suite = [[l.roi.dragon.escalade_laisseBeton, "combatDragon2", "pattes"],
					[l.roi.dragon.escalade_continue, "combatDragon2", "tete"]];
			if(choix !== "accrocher")
				suite.push([l.roi.dragon.escalade_accroche, "combatDragon2", "accrocher"]);
			break;
		case "tete":
		case "acheve":
			texte = choix === "tete" ? l.roi.dragon.escalade_tete : l.roi.dragon.acheve;
			suite = [[l.roi.dragon.acheve_oeil, "acheveDragon", "oeil"],
					[l.roi.dragon.acheve_epee, "acheveDragon", "simple"],
					[l.roi.dragon.acheve_arracheTete, "acheveDragon", "rate"]];
			break;
		case "pattes":
		case "rien":
			texte = choix === "pattes" ? l.roi.dragon.frappePattes : l.roi.dragon.boubouInutile;
			suite = [[l.roi.dragon.attaqueTete, "combatDragon2", "acheve"]];
			if(choix !== "rien")
				suite.push([l.roi.dragon.baston_bouclier, "combatDragon2", "rien"]);
			break;
		case "bouclier":
			texte = [l.roi.dragon["bouclier_"+["morsure", "griffes", "flammes"].random()], l.Venture.whatNow];
			suite = [[l.roi.dragon.baston_CHAAARGE, "combatDragon2", "fullFace"],
					[l.roi.dragon.baston_escalade, "combatDragon2", "escalade"],
					[l.roi.dragon.baston_talons, "combatDragon2", "pattes"],
					[l.roi.dragon.baston_bouclier, "combatDragon2", "bouclier"]];
			break;
	}

	update(texte, suite);
}

function acheveDragon(choix)
{
	let texte, suite, temp;

	switch(choix)
	{
		case "oeil":
		case "simple":
			texte = choix === "oeil" ? [l.roi.dragon.bute_oeil] : [l.roi.dragon.bute_epee];
			texte.push(l.roi.dragon.bute_victoire);
			suite = [[l.roi.dragon.victoire_roi, "victoire", "dragonTue"],
					[l.roi.dragon.victoire_thug, "victoire", "dragonTueMaisRienAFoutre"]];
			break;
		case "rate":
			texte = l.roi.dragon.arracheTete1;
			suite = [[l.roi.dragon.acheve_oeil, "acheveDragon", "oeil"],
					[l.roi.dragon.acheve_epee, "acheveDragon", "simple"],
					[l.roi.dragon.arracheTete1_insiste, "acheveDragon", "encoreRate"]];
			break;
		case "encoreRate":
			texte = l.roi.dragon.arracheTete2;
			suite = [[l.roi.dragon.acheve_oeil, "acheveDragon", "oeil"],
					[l.roi.dragon.acheve_epee, "acheveDragon", "simple"],
					[l.roi.dragon.arracheTete2_insiste, "acheveDragon", "toujoursRate"]];
			break;
		case "toujoursRate":
			texte = l.roi.dragon.arracheTete3;
			suite = [[l.roi.dragon.acheve_oeil, "acheveDragon", "oeil"],
					[l.roi.dragon.acheve_epee, "acheveDragon", "simple"],
					[l.roi.dragon.arracheTete3_insiste, "acheveDragon", "desespere"]];
			break;
		case "desespere":
			texte = l.roi.dragon.arracheTete4;
			suite = [[l.roi.dragon.heros_nul, "acheveDragon", "connard"],
					[l.roi.dragon.heros_batman, "acheveDragon", "connard"],
					[l.roi.dragon.pasHeros, "acheveDragon", "connard"]];
			break;
		case "connard":
			texte = l.roi.dragon.arracheTete5;
			suite = [[l.roi.dragon.acheve_oeil, "acheveDragon", "oeil"],
					[l.roi.dragon.acheve_epee, "acheveDragon", "simple"]];
			break;
	}

	update(texte, suite);
}


function queteCollier()
{
	let texte, suite;

	texte = l.roi.collier.debut;

	suite = [[l.roi.collier.charge, "bandits", "charge"],
			[l.roi.collier.infiltration, "bandits", "infiltration"],
			[l.roi.collier.nuit, "bandits", "nuit"]];

	update(texte, suite);
}

function bandits(choix)
{
	let texte = [], suite;

	switch(choix)
	{
		case "charge":
			texte = [l.roi.collier.charge_ded, reinitialise("mort")];
			break;
		case "infiltration":
			texte = l.roi.collier.infiltration_tki;
			suite = [[l.roi.collier.tki_direct, "infiltration", "direct"],
					[l.roi.collier.tki_subtil, "infiltration", "subtil"],
					[l.roi.collier.tki_tarlouze, "infiltration", "baston"]];
			break;
		case "fuite":
			texte = [l.roi.collier.attendsLaNuit];
		case "nuit":
			texte.push(l.roi.collier.nuit_pasDeGardes);
			suite = [[l.roi.collier.nuit_massacre, "victoire", "mortAuxBandits"],
					[l.roi.collier.nuit_infiltration, "infiltration", "nuit"]];
			break;
	}

	update(texte, suite);
}

function infiltration(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "direct":
		case "subtil":
			texte = choix === "direct" ? l.roi.collier.subtil_stonba : l.roi.collier.tarlouze_stonba;
			suite = [[l.roi.collier.stonba, "infiltration", "baston"],
					[l.roi.collier.chieDansLeFroc, "bandits", "fuite"]];
			break;
		case "baston":
			texte = l.roi.collier.stonga_go;
			suite = [[l.roi.collier.stonba_tete, "baston", "tete"],
					[l.roi.collier.stonbide, "baston", "bide"],
					[l.roi.collier.stonba_gambettes, "baston", "jambes"],
					[l.roi.collier.stonboubou, "baston", "flipette"]];
			break;
		case "nuit":
			texte = [l.roi.collier.nuit_foire, reinitialise("mort")];
			break;
	}

	update(texte, suite);
}

function baston(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "decapitation":
		case "tete":
		case "bide":
			texte = [l.roi.collier["stonbute_"+choix] + l.roi.collier.stonbute, l.roi.collier.stonbute_suite];
			suite = [[l.roi.collier.stonba_massacre, "victoire", "mortAuxBandits"],
					[l.roi.collier.stonba_aboule, "victoire", "bandits"],
					[l.roi.collier.stonbandit, "victoire", "tuEsUnBandit"]];
			break;
		case "jambes":
			texte = l.roi.collier.stonbute_gambettes;
			suite = [[l.roi.collier.decapitation, "baston", "decapitation"],
					[l.roi.collier.stonba_aboule, "victoire", "bandits"]];
			break;
		case "flipette":
			texte = l.roi.collier.stonboubouNul;
			suite = [[l.roi.collier.stonba_tete, "baston", "tete"],
					[l.roi.collier.stonbide, "baston", "bide"],
					[l.roi.collier.stonba_gambettes, "baston", "jambes"]];
			break;
	}

	update(texte, suite);
}


function queteMiroir()
{
	let texte, suite;

	texte = l.roi.miroir.debut;

	suite = [[l.roi.miroir.toctoc, "porteDonjon", "frappe"],
			[l.roi.miroir.crochete, "porteDonjon", "crochete"],
			[l.roi.miroir.rondin, "porteDonjon", "force"]];

	vars.belier = 0;
	vars.lumiere = l.roi.miroir.lumiere_torche;

	update(texte, suite);
}


function porteDonjon(choix)
{
	let texte, suite, v = vars;

	switch(choix)
	{
		case "frappe":
			texte = l.roi.miroir.toctoc_rien;
			suite = [[l.roi.miroir.crochete, "porteDonjon", "crochete"],
					[l.roi.miroir.rondin, "porteDonjon", "force"]];
			break;
		case "crochete":
		case "force":
			v.belier = 1;
			texte = choix === "crochete" ? [l.roi.miroir.entre_crochete] : [l.roi.miroir.entre_rondin];
			texte.push(l.roi.miroir.entre);
			suite = [[l.roi.miroir.torche, "couloirDonjon", "torche"],
					[l.roi.miroir.magie, "couloirDonjon", "magie"],
					[l.roi.miroir.seeingIsForPussies, "couloirDonjon", "fuckDis"]];
			break;
	}


	update(texte, suite);
}

function couloirDonjon(choix)
{
	let texte = [], suite, v = vars;

	switch(choix)
	{
		case "torche":
			texte = l.roi.miroir.jaiUneTorche;
			suite = [[l.roi.miroir.torche_briquet, "couloirDonjon", "torcheAllumee"],
					[l.roi.miroir.torche_magie, "couloirDonjon", "torcheAllumee"],
					[l.roi.miroir.torche_scout, "couloirDonjon", "torcheAllumee"]];
			break;
		case "magie":
			texte = [l.roi.miroir.magie_magie];
			v.lumiere = l.roi.miroir.lumiere_magie;
		case "torcheAllumee":
			texte.push(l.roi.miroir.lumiere.replace("{{LIGHT}}", v.lumiere), l.roi.miroir.culDeSac);
			suite = [[l.roi.miroir.culDeSac_sesame, "culDeSacDonjon", "sesame"],
					[l.roi.miroir.culDeSac_secret, "culDeSacDonjon", "secret"]];
			if(v.belier === 1)
				suite.push([l.roi.miroir.culDeSac_rondin, "culDeSacDonjon", "force"]);
			break;
		case "fuckDis":
			texte = [l.roi.miroir.piegeDansLeCul, reinitialise("mort")];
			break;
	}


	update(texte, suite);
}

function culDeSacDonjon(choix)
{
	let texte, suite = "none", v = vars;

	switch(choix)
	{
		case "sesame":
			texte = [l.roi.miroir.sesame];
			break;
		case "secret":
			texte = [l.roi.miroir.secret];
			break;
		case "force":
			texte = [l.roi.miroir.mur_rondin];
			v.belier = 2;
			if(v.lumiere === "torche")
			{
				texte[0] += l.roi.miroir.rondin_brule;
				v.belier = 0;
			}
			break;
	}

	texte.push(...l.roi.miroir.enigme);
	suite = [[l.roi.miroir.enigme_chaussette, "enigmeDonjon", "chaussette"],
			[l.roi.miroir.enigme_maBite, "enigmeDonjon", "bite"],
			[l.roi.miroir.enigme_fesse, "enigmeDonjon", "fesse"],
			[l.roi.miroir.enigme_congolexicomatisation, "enigmeDonjon", "congo"]];
	if(v.belier === 2)
		suite.push([l.roi.miroir.enigme_rondin, "enigmeDonjon", "force"]);


	update(texte, suite);
}

function enigmeDonjon(choix)
{
	let texte, suite = "none", v = vars;

	switch(choix)
	{
		case "chaussette":
			texte = l.roi.miroir.enigme_bravo;
			break;
		case "bite":
		case "fesse":
			texte = l.roi.miroir.enigme_ok;
			break;
		case "congo":
			texte = l.roi.miroir.enigme_non;
			suite = [[l.roi.miroir.enigme_chaussette, "enigmeDonjon", "chaussette"],
					[l.roi.miroir.enigme_maBite, "enigmeDonjon", "bite"],
					[l.roi.miroir.enigme_fesse, "enigmeDonjon", "fesse"]];
			if(v.belier === 2)
				suite.push([l.roi.miroir.enigme_rondin, "enigmeDonjon", "force"]);
			break;
		case "force":
			texte = l.roi.miroir.enigme_nik;
			v.belier = 3;
			break;
	}

	if(choix !== "congo")
	{
		texte = l.roi.miroir.sorcier;

		if(v.belier === 3)
		{
			texte[1] += l.roi.miroir.sorcier_niqueToi;
			suite = [[l.roi.miroir.sorcier_stonba, "combatDonjon", "epee"],
					[l.roi.miroir.sorcier_rondin, "combatDonjon", "belier"],
					[l.roi.miroir.sorcier_negocier, "combatDonjon", "diplomatie"]];
		}
		else
		{
			texte[1] += l.roi.miroir.sorcier_aMoi;
			suite = [[l.roi.miroir.sorcier_echange, "combatDonjon", "echange"],
					[l.roi.miroir.sorcier_menace, "victoire", "menaceMiroir"],
					[l.roi.miroir.sorcier_stonba, "combatDonjon", "epee"]];
		}
	}

	update(texte, suite);
}

function combatDonjon(choix)
{
	let texte, suite = "none";

	switch(choix)
	{
		case "epee":
			texte = l.roi.miroir.sorcier_chieDansSonFroc;
			suite = [[l.roi.miroir.recupereMiroir, "victoire", "miroir"],
					[l.roi.miroir.sorcier_dewit, "combatDonjon", "acheve"]];
			break;
		case "belier":
		case "acheve":
			texte = choix === "belier" ? l.roi.miroir.bute_rondin : l.roi.miroir.bute_epee;
			suite = [[l.roi.miroir.occupeDonjon, "victoire", "donjon"],
					[l.roi.miroir.rapporteMiroir, "victoire", "miroir"]];
			break;
		case "echange":
			texte = l.roi.miroir.echange_non;
			suite = [[l.roi.miroir.sorcier_menace, "victoire", "menaceMiroir"],
					[l.roi.miroir.sorcier_epee, "combatDonjon", "epee"]];
			break;
		case "diplomatie":
			texte = l.roi.miroir.negocier_non;
			suite = [[l.roi.miroir.sorcier_stonba, "combatDonjon", "epee"]];
			if(v.belier === 3)
				suite.push([l.roi.miroir.sorcier_rondin, "combatDonjon", "belier"]);
			break;
	}

	update(texte, suite);
}


function elfe(choix)
{
	let texte = [], suite;

	switch(choix)
	{
		case "pretre":
			texte = l.elfes.superUnPretre;
			suite = [[l.elfes.okay, "village", "pretre"],
					[l.elfes.nope, "elfe", "nan"]];
			break;
		case "scout":
			texte = [l.elfes.scout, reinitialise("mort")];
			break;
		case "fan":
			texte = l.elfes.fan;
			suite = [[l.elfes.pedophile, "victoire", "pedophile"],
					[l.elfes.fan_maison, "village", "fan"],
					[l.elfes.fan_beze, "village", "fan"]];
			break;
		case "chaispas":
			texte = l.elfes.chaisPas;
			suite = [[l.elfes.refuse, "elfe", "nan"],
					[l.elfes.okMaisJsuisNul, "village", "apprenti"],
					[l.elfes.ok, "village", "pretre"]];
			break;
		case "nan":
			texte = [l.elfes.descend];
			if(Math.random() < 0.2)
			{
				texte.push(l.elfes.whatNow);
				suite = [[l.Venture.foret_marche, "foret", "marche"],
						[l.Venture.foret_trou, "foret", "trou"]];
			}
			else
			{
				texte.push(l.elfes.peteQuatreJambes);
				suite = [[l.elfes.jenAiCinq, "elfe", "cinq"],
						[l.elfes.hein, "elfe", "ded"]];
			}
			break;
		case "cinq":
			texte = [l.elfes.cinqJambes, reinitialise("mort")];
		case "ded":
			texte.push(l.elfes.deuxJambes, reinitialise("mort"));
			break;
	}

	update(texte, suite);
}

function village(choix)
{
	let texte = [], suite;

	switch(choix)
	{
		case "fan":
			texte = l.elfes.maison.debut;
			suite = [[l.elfes.maison.joli, "maison", "sympa"],
					[l.elfes.maison.hideux, "maison", "offusque"],
					[l.elfes.maison.lit, "maison", "lit"]];
			break;
		case "apprenti":
			texte = [l.elfes.blondinisme_facile];
		case "pretre":
			texte.push(...l.elfes.ceremonie.debut);
			suite = [[l.elfes.ceremonie.poilAuxYeux, "ceremonie", "lol"],
					[l.elfes.ceremonie.gloireAuxCheveux, "ceremonie", "ok"]];
			break;
	}

	update(texte, suite);
}

function maison(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "sympa":
			texte = l.elfes.maison.aBoire;
			suite = [[l.elfes.maison.rosePlz, "boire", l.elfes.maison.nectar],
					[l.elfes.maison.jusPlz, "boire", l.elfes.maison.jus],
					[l.elfes.maison.bierePd, "maison", "offusque"]];
			break;
		case "offusque":
			texte = l.elfes.maison.offusque;
			suite = [[l.elfes.maison.pillage, "victoire", "pillage"],
					[l.elfes.maison.crame, "victoire", "pyromane"],
					[l.elfes.maison.necrophile, "victoire", "péné"]];
			break;
		case "lit":
			texte = l.elfes.maison.essayeLit;
			suite = [[l.elfes.maison.ouiMerci, "boire", l.elfes.maison.nectar],
					[l.elfes.maison.zoubiLit, "victoire", "péné"]];
			break;
	}

	update(texte, suite);
}

function boire(choix)
{
	let texte, suite;

	if(choix !== "insulte!")
	{
		texte = l.elfes.maison.boisson.replace("{{DRINK}}", choix);
		suite = [[l.elfes.maison.rabPlz, "boire", "insulte!"],
				[l.elfes.maison.zoubi, "victoire", "péné"]];
	}
	else
		texte = [l.elfes.maison.rab, reinitialise("mort")];

	update(texte, suite);
}


function ceremonie(choix)
{
	let texte = [l.elfes.ceremonie.chant], suite;

	switch(choix)
	{
		case "lol":
			texte = [l.elfes.ceremonie.indigne, reinitialise("mort")];
			break;
		case "nope":
			texte = [l.elfes.ceremonie.rate, reinitialise("mort")];
			break;
		case "ok":
			texte.push(l.elfes.ceremonie.gloireAKeratine);
			suite = [[l.elfes.ceremonie.pasMaMere, "ceremonie", "lol"],
					[l.elfes.ceremonie.benieSoitKeratine, "ceremonie", "suite"],
					[l.elfes.ceremonie.tropCoolKeratine, "ceremonie", "nope"]];
			break;
		case "suite":
			texte.push(l.elfes.ceremonie.venerons);
			suite = [[l.elfes.ceremonie.viveLeCapitalisme, "ceremonie", "nope"],
					[l.elfes.ceremonie.viveLesArteres, "ceremonie", "nope"],
					[l.elfes.ceremonie.viveLaMere, "ceremonie", "fin"],
					[l.elfes.ceremonie.etLesChauves, "ceremonie", "lol"]];
			break;
		case "fin":
			texte.push(l.elfes.ceremonie.giltoniel);
			suite = [[l.elfes.ceremonie.aVosSouhaits, "ceremonie", "lol"],
					[l.elfes.ceremonie.amen, "ceremonie", "nope"],
					[l.elfes.ceremonie.klaatu, "ceremonie", "nope"],
					[l.elfes.ceremonie.repeter, "victoire", "pretre"],
					[l.elfes.ceremonie.pareil, "ceremonie", "lol"]];
			break;
	}

	update(texte, suite);
}



function nain(choix)
{
	let texte, suite, v = vars;

	v.nom = "inconnu";
	v.connaitSonNom = false;
	v.nbNains = 20;
	v.actRahklur = 1;
	v.connaitProbas = false;
	v.probasUtilisees = false;
	v.probaAssautSeul = "";
	v.probaExplo = "";
	v.probaAssautA5 = "";
	v.probaAssautA10 = "";

	switch(choix)
	{
		case "gargamel":
			v.nom = l.nains.noms.gargamel;
			texte = l.nains.gargamel_bienvenue;
			suite = [[l.nains.suivreEnSilence, "goFestin", "rien"],
					[l.nains.suivreEtDemanderNom, "goFestin", "tki"],
					[l.nains.refuser, "nain", "ded"]];
			break;
		case "nain":
			texte = l.nains.nainGeant;
			suite = [[l.nains.jeSuis_robert, "nain", l.nains.noms.robert],
					[l.nains.jeSuis_adolphe, "nain", l.nains.noms.adolphe],
					[l.nains.jeSuis_alain, "nain", "kuwa"]];
			break;
		case "chaispas":
			v.nom = l.nains.noms.dorzun;
			texte = l.nains.dorzun_bienvenue;
			suite = [[l.nains.suivre, "goFestin", "rien"],
					[l.nains.suivreEtDemanderNom, "goFestin", "tki"],
					[l.nains.cKoiDorzun, "nain", "jambon"]];
			break;
		case "jambon":
			v.nom = l.nains.noms.tokre;
			texte = l.nains.tokre_bienvenue;
			suite = [[l.nains.suivre, "goFestin", "rien"],
					[l.nains.suivreEtDemanderNom, "goFestin", "tki"],
					[l.nains.tutfoudmoi, "nain", "tfou"]];
			break;
		case "tfou":
		case "ded":
		case "kuwa":
			switch(choix)
			{
				case "tfou":
					texte = [l.nains.mandrilTeDefonce];
					break;
				case "ded":
					texte = [l.nains.refusePasBatard];
					break;
				case "kuwa":
					texte = [l.nains.alain];
					break;
			}
			texte.push(reinitialise("mort"));
			break;
		default:
			v.nom = choix;
			texte = l.nains.bienvenue.replace("{{NAME}}", choix);
			suite = [[l.nains.accepter, "goFestin", "rien"],
					[l.nains.accepterEtDemanderNom, "goFestin", "tki"],
					[l.nains.refuser, "nain", "ded"]];
			break;
	}

	update(texte, suite);
}

function goFestin(choix)
{
	let texte = [""], suite, v = vars;

	switch(choix)
	{
		case "tki":
			texte[0] = l.nains.jeSuisMandril;
			v.connaitSonNom = true;
		case "rien":
			texte[0] += l.nains.expliqueFestin;
			texte.push(l.nains.festinCommence);
			suite = [[l.nains.laisserFinir, "festin", "okay"],
					[v.connaitSonNom ? l.nains.tgMandril : l.nains.tg, "festin", "ded"]];
			break;
	}

	update(texte, suite);
}

function festin(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "okay":
			texte = l.nains.aLaBouffe;
			suite = [[l.nains.manger, "suiteFestin", "saisPas"],
					[l.nains.sAbstenir, "suiteFestin", "aware"]];
			break;
		case "ded":
			texte = [l.nains.passageATabac, reinitialise("mort")];
			break;
	}

	update(texte, suite);
}

function suiteFestin(choix)
{
	let texte, suite;

	switch(choix)
	{
		case "saisPas":
			texte = l.nains.mange_grattement;
			suite = [[l.nains.mange_cEstRien, "bordel", "saisPas"],
					[l.nains.mange_stop, "bordel", "saisPas"]];
			break;
		case "aware":
			texte = l.nains.mange_unTrucArrive;
			suite = [[l.nains.mange_ecouter, "bordel", "saisPas"],
					[l.nains.mange_alerte, "bordel", "aware"]];
			break;
	}

	update(texte, suite);
}

function bordel(choix)
{
	let texte, suite, v = vars;

	switch(choix)
	{
		case "saisPas":
			texte = l.nains.mange_attaque;
			suite = [[l.nains.attaque_cuiller, "insectes", "ded"],
					[l.nains.attaque_planque, "insectes", "planque"]];
			break;
		case "aware":
			texte = [l.nains.mange_attaque_aware, v.connaitSonNom ? l.nains.attaque_hache : l.nains.attaque_mandril_hache];

			if(Math.random() < 0.1)
			{
				texte[1] += l.nains.attaque_hache_ouch;
				texte.push(reinitialise("mort"));
			}
			else
			{
				texte[1] += l.nains.attaque_hache_attrape;
				suite = [[l.nains.attaque_trancheChitine, "insectes", "baston"],
						[l.nains.attaque_planque, "insectes", "planqueAlerte"]];
			}
			break;
	}

	update(texte, suite);
}

function insectes(choix)
{
	let texte, suite, v = vars;

	switch(choix)
	{
		case "ded":
			texte = [l.nains.attaque_cuiller_ded, reinitialise("mort")];
			break;
		case "planque":
			texte = l.nains.attaque_planque_baston;
			suite = [[l.nains.planque_sort, "desastre"],
					[l.nains.planque_reste, "insectes", "restePlanque"]];
			v.nbNains -= ~~(Math.random() * 7 + 10);
			break;
		case "baston":
			texte = l.nains.stonba;
			suite = [[l.nains.constat, "desastre"]];
			v.nbNains -= ~~(Math.random() * 5 + 3);
			break;
		case "planqueAlerte":
			texte = [v.connaitSonNom ? l.nains.planqueAlerte_mandrilTeBute : l.nains.planqueAlerte_hoteTeBute, reinitialise("mort")];
			break;
		case "restePlanque":
			texte = l.nains.planque_fini;
			suite = [[l.nains.planque_sort, "desastre"]];
			break;
	}

	update(texte, suite);
}

function desastre()
{
	let texte, suite, v = vars;

	texte = [v.connaitSonNom ? l.nains.postAttaque_mandril : l.nains.postAttaque,
			 l.nains.postAttaque_discours.replace("{{NDWARVES}}", v.nbNains),
			 l.nains.postAttaque_tuViens];
	v.connaitSonNom = true;
	suite = [[l.nains.gPeur, "victoire", "petoches"],
			[l.nains.jeViens, "expedition"]];


	update(texte, suite);
}

function expedition()
{
	let texte, suite, v = vars;

	texte = [l.nains.enAvant.replace("{{NAME}}", v.nom),
			 l.nains.enRoute.replace("{{NDWARVES}}", v.nbNains),
			 l.nains.arrive];
	suite = [[l.nains.foncer, "rahklur", "ded"],
			[l.nains.komenKonFait, "rahklur", "plan"]];

	update(texte, suite);
}

function rahklur(choix)
{
	let texte = [], suite;

	switch(choix)
	{
		case "ded":
			texte = [l.nains.foncer_mauvaiseIdee, reinitialise("mort")];
			break;
		case "recapepete":
			texte = [l.nains.debile];
		case "plan":
			texte.push(...l.nains.explication);
			suite = [[l.nains.gCompri, "strat", "base"],
					[l.nains.gPaCompri, "rahklur", "recapepete"]];
			break;
	}

	update(texte, suite);
}

function strat(choix)
{
	let texte, suite,
		yey = false, ded = false,
		de = Math.round(Math.random() * 100),
		v = vars;

        
	if(v.probasUtilisees)
	{
		v.connaitProbas = false;
		v.probasUtilisees = false;
	}

	if(!v.connaitProbas)
	{
		if(Math.random() < 0.5)
			v.actRahklur++;
		else if(v.actRahklur > 0)
			v.actRahklur--;
	}

	switch(choix)
	{
		case "seul":
			if((v.actRahklur === 0 && de < 50) || (v.actRahklur === 1 && de < 20))
				yey = true;
			else
				ded = true;
			break;
		case "explo":
			if(Math.round(Math.random() * 5) > v.actRahklur)
			{
				v.connaitProbas = true;
				texte = [l.nains.rahklur.recon_succes];
			}
			else
			{
				texte = [l.nains.rahklur.recon_echec];
				v.nbNains--;
			}
			break;
		case "a5":
			yey = ((v.actRahklur === 0 && de < 90)
					|| (v.actRahklur === 1 && de < 60)
					|| (v.actRahklur === 2 && de < 30)
					|| de < 10);
		case "a10":
			if(choix !== "a5")
				yey = (v.actRahklur === 0
						|| (v.actRahklur === 1 && de < 80)
						|| (v.actRahklur === 2 && de < 50)
						|| de < 30);

			if(!yey)
			{
				de = rand(2) + v.actRahklur;
				if(de >= v.nbNains)
					v.nbNains = 0;
				else
					v.nbNains -= de;
				texte = [l.nains.rahklur.assaut_echec + (v.nbNains ? l.nains.rahklur.assaut_echec_morts.replace("{{NDEAD}}", de) : l.nains.rahklur.assaut_echec_tousMorts)];
				v.actRahklur++;
			}
			break;
		case "attente":
			if(v.actRahklur > 1 || v.actRahklur === 1 && Math.random() < 0.3)
				v.actRahklur--;

			de -= v.actRahklur * 10;
			if(de > 20 || v.actRahklur === 0)
				texte = [l.nains.rahklur.attente];
			else
			{
				texte = [l.nains.rahklur.attente_attaque];

				if(de+2 < v.nbNains)
					texte[0] += l.nains.rahklur.attente_attaque_np;
				else
				{
					de = rand(2) + v.actRahklur;
					if(de >= v.nbNains)
						v.nbNains = 0;
					else
						v.nbNains -= de;
					texte[0] += v.nbNains ? l.nains.rahklur.attente_attaque_morts.replace("{{NDEAD}}", de) : l.nains.rahklur.attente_attaque_tousMorts;
				}
			}

			v.probasUtilisees = true;
			break;
		default:
			texte = [l.nains.rahklur.aVousLaStrat];
			break;
	}

	if(v.actRahklur < 0)
		v.actRahklur = 0;
	if(v.actRahklur > 3)
		v.actRahklur = 3;

	if(!yey)
	{
		if(ded)
			texte = [l.nains.rahklur.assaut_ded, reinitialise("mort")];
		else
		{
			if(v.nbNains > 1)
				texte.push(l.nains.rahklur.resteDesNains.replace("{{NDWARVES}}", v.nbNains));
			else if(v.nbNains === 1)
				texte.push(l.nains.rahklur.resteUnNain);
			else
				texte.push(l.nains.rahklur.restePasDeNains);

			if(v.connaitProbas)
			{
				switch(v.actRahklur)
				{
					case 0:
						texte.push(l.nains.rahklur.act_tranquille);
						v.probaAssautSeul = " (50%)";
						v.probaExplo = " (100%)";
						v.probaAssautA5 = " (90%)";
						v.probaAssautA10 = " (100%)";
						break;
					case 1:
						texte.push(l.nains.rahklur.act_normale);
						v.probaAssautSeul = " (20%)";
						v.probaExplo = " (80%)";
						v.probaAssautA5 = " (60%)";
						v.probaAssautA10 = " (80%)";
						break;
					case 2:
						texte.push(l.nains.rahklur.act_elevee);
						v.probaAssautSeul = " (0%)";
						v.probaExplo = " (60%)";
						v.probaAssautA5 = " (30%)";
						v.probaAssautA10 = " (50%)";
						break;
					case 3:
						texte.push(l.nains.rahklur.act_vnr);
						v.probaAssautSeul = " (0%)";
						v.probaExplo = " (40%)";
						v.probaAssautA5 = " (10%)";
						v.probaAssautA10 = " (30%)";
						break;
				}
				v.probasUtilisees = true;
			}
			else
			{
				texte.push(l.nains.rahklur.act_inconnue);
				v.probaAssautSeul = "";
				v.probaExplo = "";
				v.probaAssautA5 = "";
				v.probaAssautA10 = "";
			}

			suite = [[l.nains.rahklur.assaut_seul + v.probaAssautSeul, "strat", "seul"]];
			if(v.nbNains > 0)
			{
				suite.push([l.nains.rahklur.recon + v.probaExplo, "strat", "explo"]);
				if(v.nbNains >= 5)
				{
					suite.push([l.nains.rahklur.assaut_5 + v.probaAssautA5, "strat", "a5"]);
					if(v.nbNains >= 10)
						suite.push([l.nains.rahklur.assaut_10 + v.probaAssautA10, "strat", "a10"]);
				}
			}
			suite.push([l.nains.rahklur.attendre, "strat", "attente"]);
		} // if(!ded)
	}

	if(yey)
	{
		texte = l.nains.rahklur.assaut_succes;
		suite = [
			[l.nains.rahklur.sauveMandril, "victoire", v.nom],
			[l.nains.rahklur.nikMandril, "victoire", "roiDesNains"]
		];
	}

	update(texte, suite);
}