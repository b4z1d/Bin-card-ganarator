// notice_config.js
// Update your scrolling text here
const NOTICE_TEXT = "🚀 RAFI PAY তে স্বাগতম! আমাদের নতুন আপডেট আসছে। কার্ড এখন আরও সিকিউর। সাথে থাকুন! | Stay tuned for upcoming premium features!";

// Apply text on load
document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("dynamic-marquee");
    if(el) el.innerText = NOTICE_TEXT;
});
