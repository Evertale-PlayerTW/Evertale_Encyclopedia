const fs = require("fs");
const path = require("path");

/*=====下載設定檔案=====*/
async function downloadRequiredFiles() {
	const requiredFiles = {
		Localization: [
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_ChineseSimplified.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_ChineseTraditional.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_English.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_French.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_German.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_Japanese.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_Italian.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_Korean.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/Localizable_Spanish.txt",
			"https://prd.evertaleserver.com/Prd280/Localization/FileHashes.json",
		],
		Config: [
			"https://prd.evertaleserver.com/Prd280/Monster.json",
			"https://prd.evertaleserver.com/Prd280/Weapon.json",
			"https://prd.evertaleserver.com/Prd280/Equipment.json",
			"https://prd.evertaleserver.com/Prd280/Ability.json",
			"https://prd.evertaleserver.com/Prd280/Boss.json",
			"https://prd.evertaleserver.com/Prd280/AIThreat.json",
			"https://prd.evertaleserver.com/Prd280/AttackScalor.json",
			"https://prd.evertaleserver.com/Prd280/AbilityConfig.json",
			"https://prd.evertaleserver.com/Prd280/AbilityEffect.json",
			"https://prd.evertaleserver.com/Prd280/MonsterRanker.json",
			"https://prd.evertaleserver.com/Prd280/BattleConditions.json",
			"https://prd.evertaleserver.com/Prd280/BattleBehavior.json",
			"https://prd.evertaleserver.com/Prd280/AbilityComponent.json",
			"https://prd.evertaleserver.com/Prd280/AbilityAISequence.json",
			"https://prd.evertaleserver.com/Prd280/TargetingData.json",
			"https://prd.evertaleserver.com/Prd280/MonsterConditions.json",
			"https://prd.evertaleserver.com/Prd280/AnimationData.json",
			"https://prd.evertaleserver.com/Prd280/AbilityAI.json",
			"https://prd.evertaleserver.com/Prd280/Buff.json",
			"https://prd.evertaleserver.com/Prd280/QuestReward.json",
			"https://prd.evertaleserver.com/Prd280/Shops.json",
			"https://prd.evertaleserver.com/Prd280/Package.json",
			"https://prd.evertaleserver.com/Prd280/GCodes.json",
			"https://prd.evertaleserver.com/Prd280/BundleReqs.json",
			"https://prd.evertaleserver.com/Prd280/ValidShards.json",
			"https://prd.evertaleserver.com/Prd280/LocalNotifications.json",
			"https://prd.evertaleserver.com/Prd280/ClientConfig.json",
			"https://prd.evertaleserver.com/Prd280/Clusters.json",
			"https://prd.evertaleserver.com/Prd280/Manifest.json",
			"https://prd.evertaleserver.com/Prd280/Android/hashes.json",
		],
	};

	const https = require("https");
	console.log(`Starting to download required files`);

	for (const [folder, urls] of Object.entries(requiredFiles)) {
		fs.mkdirSync(folder, { recursive: true });
		await Promise.all(
			urls.map(
				(url) =>
					new Promise((resolve, reject) => {
						const filepath = path.join(folder, path.basename(url));
						https
							.get(url, (res) => {
								if (res.statusCode !== 200) return reject(`Failed: ${res.statusCode}`);
								res
									.pipe(fs.createWriteStream(filepath))
									.on("finish", resolve)
									.on("error", () => reject(url));
							})
							.on("error", reject);
					})
			)
		);
		console.log(`> [${folder}] download complete`);
	}

	await generateRelationshipData();
}

/*=====整理夥伴關係=====*/
async function fetchCheck(url) {
	const response = await fetch(url);
	if (!response.ok) {
		//const comtentText = await response.text();
		//alert(`HTTP Error ${response.status}: ${response.statusText}\n${comtentText}`);
		throw new Error(`HTTP ${response.status}`);
	}
	return response;
}

async function getRelationshipRaw() {
	const userDevice = "Google Pixel 6";
	const userOs = "Android OS 13";
	const evtVersion = (
		await fetchCheck("https://prd.evertaleserver.com/Prd280/Android/hashes.json").then((res) =>
			res.json()
		)
	)["ver"];
	const uuid = crypto.randomUUID();

	let uid;
	let clid;
	//從快取讀uid，不然創新帳號獲取
	if (process.env.LOGIN_ACCOUNT_INFO) {
		const existingAcc = JSON.parse(process.env.LOGIN_ACCOUNT_INFO);
		uid = existingAcc["uid"];
		clid = existingAcc["clid"];
	} else {
		const baseUrl_NewUser = "https://api.prd.evertaleserver.com/newuser";
		const params_NewUser = {
			platform: "android",
			device: userDevice,
			os: userOs,
			adid: "unknown",
			shard: "1",
			req: "newuser",
			lang: "en",
			region: "JST",
			requnique: "1",
		};
		const finalUrl_NewUser = `${baseUrl_NewUser}?${new URLSearchParams(params_NewUser).toString()}`;
		const newuserResponse = await fetchCheck(finalUrl_NewUser).then((res) => res.json());
		uid = newuserResponse["newuser"]["uid"];
		clid = newuserResponse["newuser"]["clid"];
	}

	//登入以獲取sesid
	const baseUrl_Login = "https://api.prd.evertaleserver.com/login";
	const params_Login = {
		uid: uid,
		clid: clid,
		platform: "android",
		device: userDevice,
		shardpick: "1",
		bundle: "com.zigzagame.evertale",
		ver: evtVersion,
		os: userOs,
		vid: Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
		adid: "unknown",
		req: "login",
		lang: "en",
		region: "JST",
		unique: uuid,
		requnique: "1",
	};
	const finalUrl_Login = `${baseUrl_Login}?${new URLSearchParams(params_Login).toString()}`;
	const loginResponse = await fetchCheck(finalUrl_Login).then((res) => res.json());
	const sesid = loginResponse["login"]["sesid"];

	//請求獲取Relationship資訊
	const baseUrl_Relationship = "https://api.prd.evertaleserver.com/screenvalues";
	const params_Relationship = {
		screen: "Relationships",
		activeLineup: "1",
		activeEventLineup: "1",
		req: "screenvalues",
		reqid: "1",
		sesid: sesid,
		requnique: "1",
	};
	const finalUrl_Relationship = `${baseUrl_Relationship}?${new URLSearchParams(
		params_Relationship
	).toString()}`;
	const relationshipResponse = await fetchCheck(finalUrl_Relationship).then((res) => res.json());

	return relationshipResponse;
}

async function generateRelationshipData() {
	console.log(`> Build Relationship data`);
	const relationshipRaw = JSON.parse((await getRelationshipRaw())["screenvalues"]["relationships"]);
	const relationshipData = {};

	for (const relationDetail of relationshipRaw) {
		const oneRelationship = {};
		oneRelationship["Name"] = relationDetail["locKey"];
		oneRelationship["Families"] = [];
		for (const aMember of relationDetail["families"]) {
			oneRelationship["Families"].push(aMember["Item1"]);
		}
		if (relationDetail["flatAtk"]) oneRelationship["Bonus"] = `ATK+${relationDetail["flatAtk"]}`;
		if (relationDetail["flatHp"]) oneRelationship["Bonus"] = `HP+${relationDetail["flatHp"]}`;
		if (relationDetail["perAtk"]) oneRelationship["Bonus"] = `ATK+${relationDetail["perAtk"]}%`;
		if (relationDetail["perHp"]) oneRelationship["Bonus"] = `HP+${relationDetail["perHp"]}%`;

		relationshipData[relationDetail["name"]] = oneRelationship;
	}

	const relationshipData_existing = (() => {
		try {
			return JSON.parse(fs.readFileSync(path.join("Config", "Relationship.json"), "utf-8"))[
				"Relationship"
			];
		} catch {
			return null;
		}
	})();
	if (JSON.stringify(relationshipData_existing) !== JSON.stringify(relationshipData)) {
		const relationshipConfig = { Version: 23, Time: Math.floor(Date.now() / 1000) };
		relationshipConfig["Relationship"] = relationshipData;

		fs.writeFileSync(
			path.join("Config", "Relationship.json"),
			JSON.stringify(relationshipConfig, null, 2),
			"utf8"
		);
		console.log(`- Complete`);
	} else {
		console.log(`- No changes`);
	}
}

/*=====載入資料區塊=====*/

let langData = {};
let weaponType = {};
let elementType = {};
let passiveBonus = {};
const proxyUrl = "";
const resourceUrlPrefix = "https://prd.evertaleserver.com/Prd280/";
const langList = [
	"ChineseSimplified",
	"ChineseTraditional",
	"English",
	"French",
	"German",
	"Japanese",
	"Italian",
	"Korean",
	"Spanish",
];
const fallbackLang = "English";
let currentLang = null;
let currentFolder = null;

async function loadWholeData() {
	console.log(`Starting to parse data`);
	await loadAllLanguageText();

	console.log(`> Generate per-category data per language`);
	for (const lang of langList) {
		currentLang = lang;
		currentFolder = path.join("Collection", lang);
		fs.mkdirSync(currentFolder, { recursive: true });
		weaponType = {};
		elementType = {};
		passiveBonus = {};

		await Promise.all([buildMonsterData(), buildWeaponData(), buildEquipmentData()]);
		console.log(`- [${lang}] done`);
	}
}

async function loadAllLanguageText() {
	console.log(`> Set up localization text library`);
	try {
		for (const lang of langList) {
			let singleLangData = {};
			const langFileText = fs.readFileSync(
				path.join("Localization", `Localizable_${lang}.txt`),
				"utf-8"
			);
			const lines = langFileText.split(/\r?\n/);

			//方法2改良。拆行讀取，不判斷結尾，改以若出現新key則收尾
			const regex = /^"((?:\\.|[^"])*)".*?=.*?"(.*)$/;
			let currentKey = null;
			let valueCollection = [];

			for (const line of lines) {
				const match = line.match(regex);
				//匹配，紀錄key，逐行收集val。若新行有新key則收尾，現key-value存入
				if (match) {
					if (currentKey !== null) {
						let wholeValue = valueCollection.join("\n"); //拼接value，可能多行
						wholeValue = wholeValue.replace(/(?:(?<![\\])")+[^"]*\s*$/, ""); //移除結尾非\"的單獨"，與其之後內容
						singleLangData[currentKey] = wholeValue;
						currentKey = null;
						valueCollection = [];
					}
					currentKey = match[1];
					valueCollection.push(match[2]);
				} else {
					if (currentKey !== null) {
						valueCollection.push(line);
					}
				}
			}

			langData[lang] = singleLangData;
		}
	} catch (error) {
		console.error("Read or parse error:", error);
		throw error;
	}
}

function getTextByKey(textKey) {
	const oriText = langData[currentLang][textKey] ?? langData[fallbackLang][textKey];
	if (oriText) {
		return oriText
			.replace(/\\n/g, "\n")
			.replace(/\\r/g, "\r")
			.replace(/\\t/g, "\t")
			.replace(/\\'/g, "'")
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, "\\")
			.replace(/(?<!\\)\\/g, "");
	}

	return "";
}

async function buildEquipmentData() {
	try {
		const baseEquipmentConfig = JSON.parse(
			fs.readFileSync(path.join("Config", "Equipment.json"), "utf-8")
		)["Equipment"];

		const equipmentData = {};
		for (const entry of baseEquipmentConfig) {
			const equipmentContent = {};
			const entryID = entry["name"];

			equipmentContent["Name"] = getTextByKey(entryID + "NameKey");
			equipmentContent["FullName"] = equipmentContent["Name"] || entryID;
			equipmentContent["Profile"] = getTextByKey(entryID + "DescriptionKey");
			equipmentContent["Rarity"] = getRarity(entry["accessoryStars"]);
			equipmentContent["Stars"] = generateStarText(
				entry["accessoryStars"],
				entry["accessoryStars"]
			);
			equipmentContent["Stars_Curr"] = entry["accessoryStars"];
			equipmentContent["Stars_Max"] = entry["accessoryStars"];
			equipmentContent["Atk"] = entry["flatAttack"];
			equipmentContent["Hp"] = entry["flatMaxHp"];
			equipmentContent["Speed"] = entry["flatSpeed"];
			equipmentContent["Power"] = calcPowerValEz(
				"Equipment",
				entry["flatAttack"],
				entry["flatMaxHp"],
				entry["flatSpeed"],
				entry["accessoryStars"]
			);
			equipmentContent["Visible"] = entry["visible"] ? true : false;

			equipmentData[entryID] = equipmentContent;
		}

		fs.writeFileSync(
			path.join(currentFolder, "Accessory.json"),
			JSON.stringify(equipmentData, null, 4),
			"utf8"
		);
	} catch (error) {
		console.error("Read or parse error:", error);
		throw error;
	}
}

async function buildWeaponData() {
	try {
		const baseWeaponConfig = JSON.parse(
			fs.readFileSync(path.join("Config", "Weapon.json"), "utf-8")
		)["Weapon"];

		const weaponData = {};
		for (const entry of baseWeaponConfig) {
			const weaponContent = {};
			const entryID = entry["name"];

			weaponContent["Name"] = getTextByKey(entry["family"] + "01NameKey");
			weaponContent["FullName"] = weaponContent["Name"] || entryID;
			weaponContent["Profile"] = getTextByKey(entry["family"] + "01DescriptionKey");
			weaponContent["Rarity"] = getRarity(entry["evolvedStars"]);
			weaponContent["Stars"] = generateStarText(entry["stars"], entry["evolvedStars"]);
			weaponContent["Stars_Curr"] = entry["stars"];
			weaponContent["Stars_Max"] = entry["evolvedStars"];
			weaponContent["forFilter_WeaponType"] = entry["weaponPref"];
			weaponContent["WeaponType"] = getWeaponTypeName(entry["weaponPref"]);
			weaponContent["Cost"] = entry["cost"];
			weaponContent["Atk_Base"] = entry["baseAttack"];
			weaponContent["Hp_Base"] = entry["baseMaxHp"];
			weaponContent["Speed"] = 0;
			weaponContent["Power"] = calcPowerValEz(
				"Weapon",
				entry["baseAttack"],
				entry["baseMaxHp"],
				0,
				entry["evolvedStars"]
			);
			weaponContent["Visible"] = entry["visible"] ? true : false;

			const gachaIntroText = getTextByKey(entryID + "GachaIntroText");
			if (gachaIntroText) weaponContent["GachaIntro"] = gachaIntroText;

			if (entry["passives"]) {
				weaponContent["WeaponSkill"] = [];
				for (const skillID of Object.values(entry["passives"])) {
					const skillDetail = {};
					skillDetail["SkillTitle"] = getTextByKey(skillID + "NameKey");
					skillDetail["SkillDescription"] = getTextByKey(skillID + "DescriptionKey");
					weaponContent["WeaponSkill"].push(skillDetail);
				}
			}

			weaponData[entryID] = weaponContent;
		}

		setExtraEvoCount(weaponData);

		fs.writeFileSync(
			path.join(currentFolder, "Weapon.json"),
			JSON.stringify(weaponData, null, 4),
			"utf8"
		);
	} catch (error) {
		console.error("Read or parse error:", error);
		throw error;
	}
}

async function buildMonsterData() {
	try {
		//載入基礎設定
		const baseMonsterConfig = JSON.parse(
			fs.readFileSync(path.join("Config", "Monster.json"), "utf-8")
		)["Monster"];

		//載入技能設定
		const abilityDataConfig = {};
		const abilityRaw = JSON.parse(fs.readFileSync(path.join("Config", "Ability.json"), "utf-8"));
		for (const ability of abilityRaw["Ability"]) {
			abilityDataConfig[ability.name] = ability;
		}

		//載入AI威脅度設定
		const aiThreatConfig = {};
		const aiThreatRaw = JSON.parse(fs.readFileSync(path.join("Config", "AIThreat.json"), "utf-8"));
		for (const aiThreat of aiThreatRaw["AIThreat"]) {
			(aiThreatConfig[aiThreat.name] ??= {})[aiThreat.condition] = aiThreat.value;
		}

		//載入技能AI設定
		const skillAIConfig = JSON.parse(
			fs.readFileSync(path.join("Config", "AbilityAI.json"), "utf-8")
		)["AbilityAI"];

		//載入Buff設定
		const buffConfig = JSON.parse(fs.readFileSync(path.join("Config", "Buff.json"), "utf-8"))[
			"Buff"
		];

		//開始填入資料
		const monsterData = {};
		for (const entry of baseMonsterConfig) {
			const monsterContent = {};
			const entryID = entry["name"];
			const activeSkillNames = {};

			monsterContent["Name"] = getTextByKey(entryID + "NameKey");
			const name2 = getTextByKey(entryID + "SecondNameKey");
			if (name2 && name2 !== monsterContent["Name"]) monsterContent["Name2"] = name2;
			monsterContent["FullName"] = monsterContent["Name"]
				? monsterContent["Name2"]
					? `${monsterContent["Name"]} - ${monsterContent["Name2"]}`
					: monsterContent["Name"]
				: entryID;
			monsterContent["Profile"] = getTextByKey(entryID + "DescriptionKey");
			if (entry["cosmoName"])
				monsterContent["Profile_Ascended"] = getTextByKey(entry["cosmoName"] + "DescriptionKey");
			monsterContent["Rarity"] = getRarity(entry["evolvedStars"]);
			monsterContent["Stars"] = generateStarText(entry["stars"], entry["evolvedStars"]);
			monsterContent["Stars_Curr"] = entry["stars"];
			monsterContent["Stars_Max"] = entry["evolvedStars"];
			monsterContent["PreferredWeapon"] = getWeaponTypeName(entry["weaponPref"]);
			monsterContent["forFilter_Element"] = entry["element"];
			monsterContent["Element"] = getElementTypeName(entry["element"]);
			monsterContent["Cost"] = entry["cost"];
			monsterContent["Atk_Base"] = entry["baseAttack"];
			monsterContent["Hp_Base"] = entry["baseMaxHp"];
			monsterContent["Speed"] = entry["speed"];
			monsterContent["Power"] = calcPowerValEz(
				"Monster",
				entry["baseAttack"],
				entry["baseMaxHp"],
				entry["speed"],
				entry["evolvedStars"]
			);
			monsterContent["Visible"] = entry["visible"] ? true : false;

			if (entry["freeEvolve"]) {
				monsterContent["FreeEvolve"] = {};
				monsterContent["FreeEvolve"]["EvolveLevel"] = entry["freeEvolveLevel"];
				monsterContent["FreeEvolve"]["EvolveTarget"] = entry["freeEvolve"];
			}

			const gachaIntroText = getTextByKey(entryID + "GachaIntroText");
			if (gachaIntroText) monsterContent["GachaIntro"] = gachaIntroText;

			if (entry["leaderBuff"]) {
				monsterContent["LeaderSkill"] = {};
				const skillID = entry["leaderBuff"];
				monsterContent["LeaderSkill"]["SkillTitle"] = getTextByKey(skillID + "NameKey");
				monsterContent["LeaderSkill"]["SkillDescription"] = getTextByKey(
					skillID + "DescriptionKey"
				);
			}

			if (entry["activeSkills"]) {
				monsterContent["ActiveSkill"] = [];
				for (const skillID of Object.values(entry["activeSkills"])) {
					const skillDetail = {};
					//檢查技能設定中有無指定標題Key
					const skillNameKey = (abilityDataConfig[skillID]["nameKey"] ?? skillID) + "NameKey";
					skillDetail["SkillTitle"] = getTextByKey(skillNameKey);
					activeSkillNames[skillID] = skillDetail["SkillTitle"]; //另存供AI區備用

					//檢查技能設定中有無指定敘述Key
					const skillDescriptionKey =
						(abilityDataConfig[skillID]["descriptionKey"] ?? skillID) + "DescriptionKey";
					skillDetail["SkillDescription"] = getTextByKey(skillDescriptionKey);
					//TU
					skillDetail["TU"] = abilityDataConfig[skillID]["tuCost"] ?? 0;
					//靈氣。0也須帶加號，消耗值是正整數
					const { spiritGain, spiritCost } = abilityDataConfig[skillID];
					skillDetail["Spirit"] =
						Number.isInteger(spiritCost) && spiritCost > 0
							? `-${spiritCost}`
							: Number.isInteger(spiritGain)
							? `+${spiritGain}`
							: "+0";

					monsterContent["ActiveSkill"].push(skillDetail);
				}
			}
			if (entry["passives"]) {
				monsterContent["PassiveSkill"] = [];
				for (const skillID of Object.values(entry["passives"])) {
					const skillDetail = {};
					skillDetail["SkillTitle"] = getTextByKey(skillID + "NameKey");
					skillDetail["SkillDescription"] = getTextByKey(skillID + "DescriptionKey");
					monsterContent["PassiveSkill"].push(skillDetail);
				}

				const awkBonusVisible = {};
				for (let i = 1; i <= 4; i++) {
					const passiveSkillID = entry["passives"][i + 1];
					if (passiveSkillID) {
						if (passiveBonus[passiveSkillID]) {
							awkBonusVisible[i] = passiveBonus[passiveSkillID];
						} else {
							if (buffConfig[passiveSkillID]["tags"]) {
								if (buffConfig[passiveSkillID]["tags"].includes("awkHP")) {
									passiveBonus[passiveSkillID] =
										buffConfig[passiveSkillID]["behaviorOverrides"][0]["flatStatBonuses"];
									awkBonusVisible[i] = passiveBonus[passiveSkillID];
								} else if (buffConfig[passiveSkillID]["tags"].includes("awkAtk")) {
									passiveBonus[passiveSkillID] =
										buffConfig[passiveSkillID]["behaviorOverrides"][0]["flatStatBonuses"];
									awkBonusVisible[i] = passiveBonus[passiveSkillID];
								} else if (buffConfig[passiveSkillID]["tags"].includes("awkWep")) {
									passiveBonus[passiveSkillID] = buffConfig[passiveSkillID]["behaviorOverrides"][0];
									passiveBonus[passiveSkillID]["weaponPref"] = getWeaponTypeName(
										passiveBonus[passiveSkillID]["weaponPref"]
									);
									awkBonusVisible[i] = passiveBonus[passiveSkillID];
								}
							}
						}
					}
				}
				if (Object.keys(awkBonusVisible).length > 0)
					monsterContent["PassiveBonusVisible"] = awkBonusVisible;
			}

			if (entry["summonableMonsters"]) {
				monsterContent["Conjures"] = [];
				for (const conjures of entry["summonableMonsters"]) {
					monsterContent["Conjures"].push(conjures);
				}
			}

			const dialogGroup = {};
			const dialogList = {
				gachaVoices: ["Gacha", "Gacha"],
				loginVoices: ["Login", "Login"],
				tapVoices: ["Tap", "Tap"],
				idleVoices: ["Idle", "Idle"],
			};
			for (const [dialogType, dialogParams] of Object.entries(dialogList)) {
				if (entry[dialogType]) {
					const dialogSet = [];
					for (const dialogNum of entry[dialogType]) {
						dialogSet.push(getTextByKey(entry["family"] + dialogParams[0] + dialogNum + "Key"));
					}
					dialogGroup[dialogParams[1]] = dialogSet;
				}
			}
			if (Object.keys(dialogGroup).length > 0) monsterContent["Dialog"] = dialogGroup;

			monsterContent["AiLogic"] = {};
			monsterContent["AiLogic"]["PickWeight"] = entry["aiTargetPickWeight"];
			if (aiThreatConfig[entryID]) monsterContent["AiLogic"]["Threat"] = aiThreatConfig[entryID];
			monsterContent["AiLogic"]["SkillUse"] = {};
			for (const [fakeIndex, skillID] of Object.entries(entry["activeSkills"])) {
				const skillAISetting = {};
				const skillAIKey = entry["activeSkillsAI"]?.[fakeIndex]
					? entry["activeSkillsAI"][fakeIndex]
					: abilityDataConfig[skillID]["config"] + "_AI";

				if (skillAIConfig[skillAIKey]["baseAITargetingWeight"])
					skillAISetting["BaseWeight"] = skillAIConfig[skillAIKey]["baseAITargetingWeight"];
				if (skillAIConfig[skillAIKey]["globalScalorsToIgnore"])
					skillAISetting["Ignore"] = skillAIConfig[skillAIKey]["globalScalorsToIgnore"];
				if (skillAIConfig[skillAIKey]["aiTargetingSourceMonsterConditions"])
					skillAISetting["Source"] =
						skillAIConfig[skillAIKey]["aiTargetingSourceMonsterConditions"];
				if (skillAIConfig[skillAIKey]["aiTargetingMonsterConditions"])
					skillAISetting["Target"] = skillAIConfig[skillAIKey]["aiTargetingMonsterConditions"];

				monsterContent["AiLogic"]["SkillUse"][activeSkillNames[skillID]] = skillAISetting;
			}

			monsterData[entryID] = monsterContent;
		}

		setExtraEvoCount(monsterData);
		await setRelationshipData(monsterData);

		fs.writeFileSync(
			path.join(currentFolder, "Monster.json"),
			JSON.stringify(monsterData, null, 4),
			"utf8"
		);
	} catch (error) {
		console.error("Read or parse error:", error);
		throw error;
	}
}

function setExtraEvoCount(jsonData) {
	for (const id in jsonData) {
		const familyName = id.slice(0, -2);
		const numInFamily = Number(id.slice(-2));
		let evoNotFreeCount = numInFamily - 1;
		for (let i = numInFamily - 1; i > 0; i--) {
			if (jsonData?.[familyName + String(i).padStart(2, "0")]?.["FreeEvolve"]) evoNotFreeCount--;
		}
		if (evoNotFreeCount) jsonData[id]["ExtraEvoInitialCount"] = evoNotFreeCount;
	}
}

async function setRelationshipData(monsterData) {
	let relationshipData = JSON.parse(
		fs.readFileSync(path.join("Config", "Relationship.json"), "utf-8")
	)["Relationship"];

	for (const [relationID, relationDetail] of Object.entries(relationshipData)) {
		const relationshipName = getTextByKey(relationDetail["Name"]);
		for (const memberID of relationDetail["Families"]) {
			const clanID = memberID.slice(0, -2);
			for (let i = 1; i <= 3; i++) {
				charID = clanID + String(i).padStart(2, "0");
				if (monsterData[charID]) {
					const relationGroup = {};
					relationGroup["RelationshipName"] = relationshipName;
					relationGroup["RelationshipFamily"] = relationDetail["Families"];
					relationGroup["RelationshipBuff"] = relationDetail["Bonus"]
						.replace("ATK", getTextByKey("RelationshipAttackKey"))
						.replace("HP", getTextByKey("RelationshipHPKey"));
					monsterData[charID]["Relationship"] ??= {};
					monsterData[charID]["Relationship"][relationID] = relationGroup;
				}
			}
		}
	}
}

function getRarity(stars) {
	switch (stars) {
		case 6:
			return "SSR";
		case 5:
			return "SR";
		case 4:
			return "R";
		case 3:
		case 2:
		case 1:
		case 0:
			return "N";
		default:
			return "?";
	}
}

function generateStarText(currStar, maxStar) {
	if (maxStar >= currStar) {
		if (maxStar <= 0) {
			return 0;
		} else {
			return "★".repeat(currStar) + "☆".repeat(maxStar - currStar);
		}
	} else {
		return "Stars Error";
	}
}

function calcPowerValEz(type, atk, hp, spd, maxStar) {
	const weight_atk = 30;
	const weight_hp = 6;
	const weight_spd = type !== "Equipment" ? 0 : 180;

	let powVal = weight_atk * atk + weight_hp * hp + weight_spd * spd;
	if (type === "Monster") {
		if (maxStar === 6) powVal *= 2;
		if (maxStar === 5) powVal *= 1.5;
	}
	return powVal;
}

function getWeaponTypeName(weaponTypeKey) {
	if (!weaponTypeKey) return "-";
	if (weaponType[weaponTypeKey]) return weaponType[weaponTypeKey];
	weaponType[weaponTypeKey] = getTextByKey(weaponTypeKey + "NameKey");
	return weaponType[weaponTypeKey];
}

function getElementTypeName(elementTypeKey) {
	if (!elementTypeKey) return "-";
	if (elementType[elementTypeKey]) return elementType[elementTypeKey];
	elementType[elementTypeKey] = getTextByKey(elementTypeKey + "Key");
	return elementType[elementTypeKey];
}

async function main() {
	await downloadRequiredFiles();
	await loadWholeData();
}

main();
