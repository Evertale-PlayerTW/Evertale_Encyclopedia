const fs = require("fs");
const https = require("https");
const path = require("path");
const { glob } = require("glob");

const baseUrl = "https://prd.evertaleserver.com/Prd280/Android/";

const assetGroup = {
	Monster: {
		target: "monsterbundle",
		list: [],
		portrait: "Extract/Monster/assets/simulatedassetbundles/*/smallmonsterportraits/*/*_2.png",
	},
	Weapon: {
		target: "weaponsbundle",
		list: [],
		portrait: "Extract/Weapon/assets/simulatedassetbundles/*/weaponportraitsbundlednc/*/*01.png",
	},
	Equipment: {
		target: "accessoriesbundle",
		list: [],
		portrait: "Extract/Equipment/assets/simulatedassetbundles/*/smallaccessoryportraits1/*01.png",
	},
};

async function downloadAssetFiles() {
	const hashUrl = baseUrl + "hashes.json";

	try {
		const response = await fetch(hashUrl);
		if (!response.ok) throw new Error(`HTTP error ${response.status}`);
		const hashJson = await response.json();

		//先建立下載清單
		for (const key of Object.keys(hashJson)) {
			if (key.includes("test")) continue;
			const category = Object.keys(assetGroup).find((k) => key.includes(assetGroup[k]["target"]));
			if (!category) continue;
			assetGroup[category]["list"].push(key);
		}

		//開始下載
		for (const category in assetGroup) {
			const downloadFolder = path.join("Download", category);
			fs.mkdirSync(downloadFolder, { recursive: true });
			const assetNames = assetGroup[category]["list"];

			await Promise.all(
				assetNames.map(
					(assetName) =>
						new Promise((resolve, reject) => {
							const downloadUrl = baseUrl + assetName;
							const filePath = path.join(downloadFolder, assetName);

							https
								.get(downloadUrl, (res) => {
									if (res.statusCode !== 200) return reject(`Failed: ${res.statusCode}`);
									res
										.pipe(fs.createWriteStream(filePath))
										.on("finish", resolve)
										.on("Error", () => reject(downloadUrl));
								})
								.on("Error", reject);
						})
				)
			);
		}
	} catch (err) {
		console.error("Error:", err);
	}
	console.log("Download assets complete");
}

async function extractAssets() {
	const { execSync } = require("child_process");
	fs.mkdirSync("Extract", { recursive: true });

	//解包出sprite
	for (const category in assetGroup) {
		const importFolfer = path.join("Download", category);
		const exportFolfer = path.join("Extract", category);
		const extractCommand = `AssetStudioModCLI "${importFolfer}" -g ContainerFull  -f AssetName -t sprite -o "${exportFolfer}"`;
		execSync(extractCommand, { stdio: ["ignore", "ignore", "ignore"] });
		console.log(`Extract [${category}] sprites complete`);
	}

	//提取頭像
	for (const category in assetGroup) {
		const portraitCategoryFolder = path.join("Portrait", category);
		fs.mkdirSync(portraitCategoryFolder, { recursive: true });
		const portraitMatch = assetGroup[category]["portrait"];
		const portraitFiles = await glob(portraitMatch);
		for (const filePath of portraitFiles) {
			const fileName =
				category === "Monster"
					? path.basename(path.dirname(filePath)) + path.extname(filePath) //用前一資料夾名為檔名
					: path.basename(filePath);
			const targetPath = path.join(portraitCategoryFolder, fileName);

			if (alreadyFiles.has(targetPath)) {
				console.log(`Existing file: ${targetPath}`);
			} else {
				alreadyFiles.add(targetPath);
				fs.renameSync(filePath, targetPath);
			}
		}
		console.log(`Catch [${category}] portraits complete`);
	}
}

async function main() {
	await downloadAssetFiles();
	await extractAssets();
}

main();
