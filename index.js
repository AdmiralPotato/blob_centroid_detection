const canvas = document.getElementById("canny");
const startButton = document.getElementById("start-button");
const videoSelect = document.getElementById("video-select");
let { width, height } = canvas;
const video = document.getElementById("blobby");
const context = canvas.getContext("2d", { willReadFrequently: true });
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = "high";
console.log("Context?", context);

let hasGestured = false;
const bright = 255 * 3;
const videos = {
	"admiral_potato-helpful_goose.webm": {
		threshold: 0.8 * bright,
		invert: false,
	},
	"tatsuya_m-splitting_lens.mp4": {
		threshold: 0.3 * bright,
		invert: true,
	},
	"tatsuya_m-rewrapping_tennis_balls.mp4": {
		threshold: 0.25 * bright,
		invert: true,
	},
	"admiral_potato-electric_branches.webm": {
		threshold: 0.9 * bright,
		invert: false,
	},
	"admiral_potato-11th_hour_hotness.webm": {
		threshold: 0.1 * bright,
		invert: false,
	},
	"admiral_potato-flow_1.webm": {
		threshold: 0.3 * bright,
		invert: true,
	},
	"admiral_potato-process_growth_pains.webm": {
		threshold: 0.2 * bright,
		invert: true,
	},
	"admiral_potato-circular_overlap_0.webm": {
		threshold: 0.7 * bright,
		invert: false,
	},
	"admiral_potato-sparkle_party.webm": {
		threshold: 0.5 * bright,
		invert: false,
	},
	"admiral_potato-candy_corn_rain.webm": {
		threshold: 0.6 * bright,
		invert: false,
	},
	"admiral_potato-hex_doctor.webm": {
		threshold: 0.5 * bright,
		invert: false,
	},
	"admiral_potato-ibuprofen_spinning.webm": {
		threshold: 0.5 * bright,
		invert: false,
		background: "#000",
	},
};
Object.entries(videos).forEach(([name, config]) => {
	const option = document.createElement("option");
	option.innerText = name;
	option.value = name;
	videoSelect.appendChild(option);
});
let currentVideoConfig = null;
const setCurrentVideoName = (name) => {
	currentVideoConfig = videos[name];
	video.src = `videos/${name}`;
	videoSelect.value = name;
	// video.playbackRate = 0.25;
	if (hasGestured) {
		video.play();
	}
};
videoSelect.addEventListener("change", (event) => {
	hasGestured = true;
	setCurrentVideoName(event.target.value);
});

const uniqueColors = [
	[255, 0, 0],
	[0, 255, 0],
	[255, 255, 0],
	[0, 0, 255],
	[255, 0, 255],
	[0, 255, 255],
];

const contrast = (r, g, b) => {
	const total = r + g + b;
	return total > currentVideoConfig.threshold;
};

const maxBlobDistance = 3;
const getPixelOffset = (x, y) => x + y * width;
const isAboveThreshold = (imageData, x, y) => {
	const i = getPixelOffset(x, y) * 4;
	const data = imageData.data;
	return contrast(data[i], data[i + 1], data[i + 2]);
};
const neighborOffsets = [
	[-1, -1],
	[0, -1],
	[1, -1],
	[-1, 0],
	[1, 0],
	[-1, 1],
	[0, 1],
	[1, 1],
];
const createBlob = (imageData, membership, blobs, startX, startY) => {
	// TODO: reuse the same array
	const bestDistances = new Uint16Array(width, height);
	const coordsToProcess = [
		// X coordinate, Y coordinate, distance from blob
		[startX, startY, 1],
	];
	const blobId = blobs.length + 1;
	const blob = {
		blobId,
		uniqueColor: uniqueColors[(blobId - 1) % uniqueColors.length],
		totalPixelCount: 0,
		centroid: null,
		xMin: startX,
		yMin: startY,
		xMax: startX,
		yMax: startY,
	};
	blobs.push(blob);
	let sumOfX = 0;
	let sumOfY = 0;
	while (coordsToProcess.length > 0) {
		const coords = coordsToProcess.pop();
		const offset = getPixelOffset(coords[0], coords[1]);
		if (membership[offset] !== 0) {
			// the pixel in question was already handled, move on to another
			continue;
		}
		let neighborDistance = 1;
		let isInBlob = true;
		if (!isAboveThreshold(imageData, coords[0], coords[1])) {
			// the pixel is not part of a blob, but it may connect us to a
			// nearby not-quite-contiguous blob
			isInBlob = false;
			neighborDistance = coords[2] + 1;
			if (bestDistances[offset] != 0 && bestDistances[offset] <= coords[2]) {
				continue;
			}
		}
		// if the pixel is part of this blob, handle it
		if (isInBlob) {
			blob.totalPixelCount += 1;
			sumOfX += coords[0];
			sumOfY += coords[1];
			membership[offset] = blob.blobId;
			const data = imageData.data;
			const i = offset * 4;
			data[i] = blob.uniqueColor[0];
			data[i + 1] = blob.uniqueColor[1];
			data[i + 2] = blob.uniqueColor[2];
			blob.xMin = Math.min(blob.xMin, coords[0]);
			blob.yMin = Math.min(blob.yMin, coords[1]);
			blob.xMax = Math.max(blob.xMax, coords[0]);
			blob.yMax = Math.max(blob.yMax, coords[1]);
		}
		// if the distance isn't too great, handle neighbors;
		if (neighborDistance >= maxBlobDistance) continue;
		for (let n = 0; n < neighborOffsets.length; ++n) {
			let neighbor = neighborOffsets[n];
			let x = coords[0] + neighbor[0];
			let y = coords[1] + neighbor[1];
			if (x < 0 || x >= width || y < 0 || y >= height) {
				// the pixel would be outside the image, skip it
				continue;
			}
			let offset = getPixelOffset(x, y);
			if (membership[offset] !== 0) {
				// it's already been processed, don't process it again
				continue;
			}
			if (bestDistances[offset] > 0 && bestDistances <= neighborDistance) {
				// we've already evaluated it from the same or better distance,
				// don't process it again
				continue;
			}
			bestDistances[offset] = neighborDistance;
			coordsToProcess.push([x, y, neighborDistance]);
		}
	}
	blob.centroid = [
		sumOfX / blob.totalPixelCount,
		sumOfY / blob.totalPixelCount,
	];
};
const getBlobForPixel = (membership, blobs, x, y) => {
	const i = membership[getPixelOffset(x, y)];
	if (i === 0) {
		return null; // not part of a blob
	} else {
		return blobs[i - 1]; // part of an existing blob
	}
};

const loopy = () => {
	requestAnimationFrame(loopy);
	context.globalCompositeOperation = "source-over";
	context.fillStyle = currentVideoConfig.background || "#fff";
	context.fillRect(0, 0, width, height);
	if (currentVideoConfig.invert) {
		context.globalCompositeOperation = "difference";
	}
	context.drawImage(video, 0, 0, width, height);
	const imageData = context.getImageData(0, 0, width, height);
	const data = imageData.data;
	const membership = new Uint32Array(width * height);
	const blobs = [];
	for (let y = 0; y < height; ++y) {
		for (let x = 0; x < width; ++x) {
			if (
				getBlobForPixel(membership, blobs, x, y) === null &&
				isAboveThreshold(imageData, x, y)
			) {
				// This is a pixel that's part of a blob, but not a blob we've
				// already seen.
				createBlob(imageData, membership, blobs, x, y);
			}
		}
	}
	context.putImageData(imageData, 0, 0);
	// console.log("blobs", blobs);
	context.globalCompositeOperation = "difference";
	context.strokeStyle = "#fff";
	context.lineWidth = 2;
	const centroidSize = 4;
	for (let i = 0; i < blobs.length; i++) {
		const blob = blobs[i];
		if (blob.totalPixelCount < 100) {
			continue;
		}
		context.beginPath();
		context.moveTo(
			blob.centroid[0] - centroidSize,
			blob.centroid[1] - centroidSize,
		);
		context.lineTo(
			blob.centroid[0] + centroidSize,
			blob.centroid[1] + centroidSize,
		);
		context.stroke();
		context.beginPath();
		context.moveTo(
			blob.centroid[0] + centroidSize,
			blob.centroid[1] - centroidSize,
		);
		context.lineTo(
			blob.centroid[0] - centroidSize,
			blob.centroid[1] + centroidSize,
		);
		context.stroke();
		context.beginPath();
		context.rect(
			blob.xMin,
			blob.yMin,
			blob.xMax - blob.xMin,
			blob.yMax - blob.yMin,
		);
		context.stroke();
	}
};

startButton.addEventListener("click", () => {
	hasGestured = true;
	video.play();
	requestAnimationFrame(loopy);
});

video.addEventListener("resize", () => {
	const rect = video.getBoundingClientRect();
	height = Math.min(width, width * (rect.height / rect.width));
	canvas.height = height;
});

setCurrentVideoName("admiral_potato-helpful_goose.webm");
