const canvas = document.getElementById("canny");
const startButton = document.getElementById("start-button");
const { width, height } = canvas;
const video = document.getElementById("blobby");
const context = canvas.getContext("2d", { willReadFrequently: true });
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = "high";
console.log("Context?", context);

const uniqueColors = [
	[255, 0, 0],
	[0, 255, 0],
	[255, 255, 0],
	[0, 0, 255],
	[255, 0, 255],
	[0, 255, 255],
];

const bright = 255 * 3;
const threshold = 0.3 * bright;
const contrast = (r, g, b) => {
	const total = r + g + b;
	return total > threshold;
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
	};
	blobs.push(blob);
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
	context.globalCompositeOperation = "difference";
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
	context.globalCompositeOperation = "source-over";
	context.putImageData(imageData, 0, 0);
};

startButton.addEventListener("click", () => {
	video.play();
	requestAnimationFrame(loopy);
});
