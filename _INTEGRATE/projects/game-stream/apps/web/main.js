// TODO: Expose Client Side Calls (https://github.com/elysiajs/eden)

import {
	connect,
	createLocalTracks,
	Room,
	LocalDataTrack,
} from "@livekit/client";

const video = document.getElementById("game");

// === Step 1: Connect to LiveKit ===
// Replace these values with your actual host/token setup
const LIVEKIT_URL = "ws://localhost:7880";
const TOKEN_ENDPOINT = `http://localhost:8080/token?identity=${identity}&room=${roomName}`;
const REFRESH_ENDPOINT = `http://localhost:8080/refresh-token?identity=${identity}&room=${roomName}`;

async function fetchToken() {
	return fetch(TOKEN_ENDPOINT).then((res) => res.text());
}

async function fetchNewToken() {
	return fetch(REFRESH_ENDPOINT).then((res) => res.text());
}

let currentToken = await fetchToken();

// Send token to input-agent so it can join as this user or as a paired controller
await fetch("http://localhost:5000/token", {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ token: currentToken }),
});

const room = await connect(LIVEKIT_URL, TOKEN, {
	// Only subscribe to tracks, don't publish camera/mic
	autoSubscribe: true,
	adaptiveStream: true,
	dynacast: true,
	tracks: await createLocalTracks({
		audio: false,
		video: false,
	}),
	reconnectPolicy: {
		// Customize retries
		maxRetries: 5,
		retryDelay: 2000,
	},
	/*rtcConfig: {
		iceTransportPolicy: "all",
		bundlePolicy: "balanced",
		rtcpMuxPolicy: "require",
		iceServers: [
			{ urls: "stun:stun.l.google.com:19302" },
			{
				urls: "turn:your.turn.server:3478",
				username: "...",
				credential: "...",
			},
		],
	},*/
});

room.on("reconnecting", async () => {
	console.warn("🔌 Reconnecting... attempting token refresh");
	try {
		const newToken = await fetchNewToken();
		await room.reconnect(newToken);
		console.info("✅ Reconnected with new token");
	} catch (err) {
		console.error("❌ Failed to refresh token or reconnect:", err);
	}
});
room.on("reconnected", () => {
	console.info("✅ Reconnected to LiveKit session.");
});
room.on("disconnected", () => {
	console.error("❌ Disconnected permanently.");
});
// === Step 2: Attach Remote Video ===
room.on("trackSubscribed", (track, publication, participant) => {
	if (track.kind === "video") {
		track.attach(video);
	}
	if (track.kind === "audio") {
		track.attach(document.createElement("audio")).play();
	}
});

room.on("connectionQualityChanged", (quality, participant) => {
	console.log("📶 RTCP Quality Stats:", participant.getConnectionQuality());
});

// === Step 3: Adaptive Bitrate Monitoring ===
async function monitorStats() {
	const participant = room.localParticipant;
	for (const track of participant.videoTracks.values()) {
		const sender = track.track?.mediaStreamTrack?.getSettings?.()?.sender;
		if (!sender) continue;

		const stats = await sender.getStats();
		stats.forEach((report) => {
			if (report.type === "outbound-rtp" && report.kind === "video") {
				const bitrateKbps = Math.floor((report.bytesSent * 8) / 1024);
				console.log(`📈 Current bitrate: ${bitrateKbps} kbps`);
			}
		});
	}
}
setInterval(monitorStats, 3000);

// === Step 4: Adjust Bitrate on Network Change ===
function setBitrate(kbps) {
	const sender =
		room.localParticipant.getTrackPublication("video")?.track?.sender;
	if (!sender) return;

	const params = sender.getParameters();
	if (!params.encodings) params.encodings = [{}];
	params.encodings[0].maxBitrate = kbps * 1000;

	sender.setParameters(params).catch(console.warn);
}

navigator.connection?.addEventListener("change", () => {
	const down = navigator.connection.downlink || 1;
	if (down > 10) setBitrate(3000);
	else if (down > 5) setBitrate(1500);
	else setBitrate(800);
});

// === Step 5: Send Gamepad Input via DataChannel ===
const inputTrack = new LocalDataTrack();
room.localParticipant.publishTrack(inputTrack);

let latestDeviceMotion = null;
window.addEventListener("devicemotion", (event) => {
	latestDeviceMotion = {
		accel: event.accelerationIncludingGravity,
		rotation: event.rotationRate,
	};
});

setInterval(() => {
	const gp = navigator.getGamepads()[0];
	if (!gp) return;

	const payload = {
		timestamp: Date.now(),
		buttons: gp.buttons.map((b) => ({
			pressed: b.pressed,
			value: b.value, // For analog triggers
		})),
		axes: gp.axes,
		vibrationSupported: !!gp.vibrationActuator,
		// Add device motion if on mobile
		motion: latestDeviceMotion, // From 'devicemotion' listener
	};

	if (window.latestSensorData) {
		payload.sensor = window.latestSensorData;
	}

	inputTrack.send(JSON.stringify(payload));
}, 100);

// Step 5: Gyroscope & Accelerometer (Mobile)
if (window.DeviceMotionEvent) {
	window.addEventListener("devicemotion", (e) => {
		const accel = e.accelerationIncludingGravity;
		const rot = e.rotationRate;
		window.latestSensorData = {
			accel: accel
				? {
						x: accel.x,
						y: accel.y,
						z: accel.z,
					}
				: null,
			gyro: rot
				? {
						alpha: rot.alpha,
						beta: rot.beta,
						gamma: rot.gamma,
					}
				: null,
		};
	});
}

room.on("dataReceived", (payload, participant, kind) => {
	try {
		const msg = JSON.parse(payload);
		if (msg.type === "haptics" && navigator.vibrate) {
			navigator.vibrate(msg.pattern || 100);
		}
	} catch (err) {
		console.warn("Invalid haptics data", err);
	}
});

// === Debug Events ===
room.on("participantConnected", (p) => console.log(`🔗 ${p.identity} joined`));
room.on("participantDisconnected", (p) => console.log(`❌ ${p.identity} left`));
room.on("disconnected", () => console.log("🚪 Disconnected from room"));
