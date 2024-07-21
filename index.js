const canvas = document.getElementById("canny");
const startButton = document.getElementById("start-button");
const { width, height } = canvas;
const video = document.getElementById("blobby");
const context = canvas.getContext("2d", { willReadFrequently: true });
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = "high";
console.log("Context?", context);
startButton.addEventListener("click", () => {
	video.play();
});

const bright = 255 * 3;
const threshold = 0.3 * bright;
const contrast = (r, g, b) => {
	const total = r + g + b;
	return total > threshold;
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
	for (let i = 0; i < data.length; i += 4) {
		const value = contrast(data[i], data[i + 1], data[i + 2]) ? 255 : 0;
		data[i] = value; // red
		data[i + 1] = value; // green
		data[i + 2] = value; // blue
	}
	context.globalCompositeOperation = "source-over";
	context.putImageData(imageData, 0, 0);
};

requestAnimationFrame(loopy);
