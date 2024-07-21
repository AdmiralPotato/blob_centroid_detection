const canvas = document.getElementById("canny");
const startButton = document.getElementById("start-button");
const videoSelect = document.getElementById("video-select");
const { width, height } = canvas;
const video = document.getElementById("blobby");
const context = canvas.getContext("2d", { willReadFrequently: true });
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = "high";
console.log("Context?", context);

let hasGestured = false;
const bright = 255 * 3;
const videos = {
	"tatsuya_m-splitting_lens.mp4": {
		threshold: 0.3 * bright,
		invert: true,
	},
	"admiral_potato-electric_branches.webm": {
		threshold: 0.9 * bright,
		invert: false,
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
	video.playbackRate = 0.25;
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

const getPixelOffset = (x, y) => x + y * width;
const isAboveThreshold = (imageData, x, y) => {
	const i = getPixelOffset(x, y) * 4;
	const data = imageData.data;
	return contrast(data[i], data[i + 1], data[i + 2]);
};
const createBlob = (imageData, membership, blobs, startX, startY) => {
	const coordsToProcess = [[startX, startY]];
	const blobId = blobs.length + 1;
	const blob = {
		blobId,
		uniqueColor: uniqueColors[(blobId - 1) % uniqueColors.length],
		totalPixelCount: 0,
		centroid: null,
	};
	blobs.push(blob);
	let sumOfX = 0;
	let sumOfY = 0;
	while (coordsToProcess.length > 0) {
		const coords = coordsToProcess.pop();
		if (
			coords[0] < 0 ||
			coords[0] >= width ||
			coords[1] < 0 ||
			coords[1] >= height
		) {
			// the pixel would be outside the image, move on to another
			continue;
		}
		const offset = getPixelOffset(coords[0], coords[1]);
		if (membership[offset] !== 0) {
			// the pixel in question was already handled, move on to another
			continue;
		}
		if (!isAboveThreshold(imageData, coords[0], coords[1])) {
			// the pixel is not part of a blob, move on to another
			continue;
		}
		// if we reach this point, that pixel is part of this blob.
		// handle it...
		blob.totalPixelCount += 1;
		sumOfX += coords[0];
		sumOfY += coords[1];
		membership[offset] = blob.blobId;
		const data = imageData.data;
		const i = offset * 4;
		data[i] = blob.uniqueColor[0];
		data[i + 1] = blob.uniqueColor[1];
		data[i + 2] = blob.uniqueColor[2];
		// ...and handle its neighbors.
		coordsToProcess.push([coords[0] - 1, coords[1] - 1]);
		coordsToProcess.push([coords[0], coords[1] - 1]);
		coordsToProcess.push([coords[0] + 1, coords[1] - 1]);
		coordsToProcess.push([coords[0] - 1, coords[1]]);
		coordsToProcess.push([coords[0] + 1, coords[1]]);
		coordsToProcess.push([coords[0] - 1, coords[1] + 1]);
		coordsToProcess.push([coords[0], coords[1] + 1]);
		coordsToProcess.push([coords[0] + 1, coords[1] + 1]);
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
	context.fillStyle = "#fff";
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
	context.globalCompositeOperation = "source-over";
	context.strokeStyle = "#000";
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
	}
};

startButton.addEventListener("click", () => {
	hasGestured = true;
	video.play();
	requestAnimationFrame(loopy);
});

setCurrentVideoName("tatsuya_m-splitting_lens.mp4");
