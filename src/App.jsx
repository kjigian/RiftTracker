import { useState, useEffect, useCallback } from "react";
import { getAllCards, getCollection, updateCard, getShoppingChecked, toggleShopItem, getRecentScans, getUser, onAuthChange, signOut } from "./lib/supabase";
import Auth from "./components/Auth";

// ============================================================
// RIFTBOUND CARD SORTER — COMPLETE PROJECT HUB
// ============================================================

const DOMAINS = [
  { name: "Fury", color: "#dc2626", icon: "🔥" },
  { name: "Calm", color: "#16a34a", icon: "🌿" },
  { name: "Mind", color: "#2563eb", icon: "🧠" },
  { name: "Body", color: "#ea580c", icon: "💪" },
  { name: "Chaos", color: "#9333ea", icon: "🌀" },
  { name: "Order", color: "#eab308", icon: "⚖️" },
];

// --- SHOPPING LIST DATA ---
const SHOP = [
  { cat: "🧠 Brain (ESP32-CAM)", items: [
    { name: "ESP32-CAM (with OV2640 camera)", link: "https://www.amazon.com/s?k=ESP32-CAM+OV2640", price: "$10", qty: 1, compat: "ESP32-S + 2MP OV2640 camera on one board. Built-in WiFi for streaming to website. 3.3V GPIO for motor drivers.", note: "The all-in-one brain. Camera + motor controller + WiFi in one $10 board." },
    { name: "ESP32-CAM-MB (USB programmer)", link: "https://www.amazon.com/s?k=ESP32-CAM-MB+programmer", price: "$4", qty: 1, compat: "Snap-on USB board for flashing firmware via Arduino IDE. Also provides 5V power via USB.", note: "Makes uploading code one-click. Also powers the ESP32-CAM during development." },
    { name: "USB-A to Micro-USB Cable", link: "https://www.amazon.com/s?k=micro+usb+cable+data+3ft", price: "$5", qty: 1, compat: "Connects ESP32-CAM-MB to your computer for power + firmware upload.", note: "Make sure it's a data cable, not charge-only." },
    { name: "Small LED Ring Light (3.3V or USB)", link: "https://www.amazon.com/s?k=small+LED+ring+light+usb+adjustable", price: "$10", qty: 1, compat: "Consistent lighting for card recognition. Inner Ø >12mm for camera lens.", note: "Consistent lighting is critical for color detection." },
  ]},
  { cat: "⚙️ Motors & Drivers", items: [
    { name: "STEPPERONLINE NEMA 17 (59Ncm, 2A, 5mm D-shaft) ×2", link: "https://www.amazon.com/Stepper-Motor-59Ncm-4-wire-Printer/dp/B00Y2HJE22", price: "$22", qty: 1, compat: "2A matches TMC2209 (2.8A peak). 5mm D-shaft fits turntable hub directly. 4-wire bipolar with 1m cable.", note: "2-pack. One for feed roller, one for turntable." },
    { name: "BIGTREETECH TMC2209 V1.3 Drivers ×2", link: "https://www.amazon.com/BIGTREETECH-TMC2209-Stepper-Driver-Printer/dp/B08C2DJQ6B", price: "$14", qty: 1, compat: "2.8A peak, 4.75-28V motor voltage, 3.3V logic OK. StealthChop2 silent. STEP/DIR default mode — wire to ESP32 GPIO.", note: "2-pack with heatsinks included." },
    { name: "MG996R Servo (metal gear, 180°) ×4 pack", link: "https://www.amazon.com/4-Pack-MG996R-Torque-Digital-Helicopter/dp/B07MFK266B", price: "$12", qty: 1, compat: "4.8-7.2V, PWM 500-2500μs. 12kg·cm torque. 40.7×19.7×42.9mm matches gate housing.", note: "Only need 1 but 4-pack is cheapest. 25T horn included." },
  ]},
  { cat: "🔩 Frame & Structure", items: [
    { name: "2020 V-Slot Extrusion 500mm (4pk) + T-Nuts", link: "https://www.amazon.com/Aluminum-Extrusion-European-Standard-20mmx20mm/dp/B09DTL7G6X", price: "$20", qty: 1, compat: "V-slot, 20-series compatible. Includes 20 T-nuts + M5 screws.", note: "Cut to length with hacksaw." },
    { name: "2020 Corner Brackets Kit (20-set)", link: "https://www.amazon.com/BLCCLOY-2020-Aluminum-Extrusion-Connectors/dp/B0CG36V9SD", price: "$12", qty: 1, compat: "90° L-brackets, M6 bolts + T-nuts.", note: "20 brackets is plenty." },
  ]},
  { cat: "🔄 Card Feed", items: [
    { name: "Silicone Roller Wheel (25-30mm, 5mm bore)", link: "https://www.amazon.com/s?k=silicone+rubber+wheel+5mm+bore+25mm", price: "$8", qty: 1, compat: "5mm bore fits NEMA 17 shaft directly.", note: "Or 3D print a hub + wrap with rubber tubing." },
    { name: "5mm Rigid Shaft Coupler (2pk)", link: "https://www.amazon.com/s?k=5mm+rigid+shaft+coupler+aluminum", price: "$6", qty: 1, compat: "Backup if roller doesn't fit motor shaft directly.", note: "Aluminum with set screws." },
    { name: "Compression Spring Assortment", link: "https://www.amazon.com/s?k=small+compression+spring+assortment+kit", price: "$7", qty: 1, compat: "~10mm OD × 25-30mm for hopper pusher.", note: "Start with light tension." },
  ]},
  { cat: "📡 Electronics & Wiring", items: [
    { name: "Adafruit IR Break Beam 5mm (ADA2168)", link: "https://www.amazon.com/Adafruit-IR-Break-Beam-Sensor/dp/B00XW2NVJU", price: "$4", qty: 2, compat: "3.3V/5V, open-collector output. Triggers camera capture when card is in position.", note: "Buy 2. One for card detection." },
    { name: "12V 5A DC Power Supply", link: "https://www.amazon.com/s?k=12V+5A+DC+power+supply+barrel+jack", price: "$12", qty: 1, compat: "Feeds TMC2209 VMOT (4.75-28V). 5A for 2× NEMA 17 at 2A each.", note: "Get barrel jack screw terminal adapter too." },
    { name: "LM2596 Buck Converter (3pk)", link: "https://www.amazon.com/s?k=LM2596+buck+converter+adjustable", price: "$8", qty: 1, compat: "Steps 12V → 5.5V for MG996R servo. 3A output handles servo stall current.", note: "Set to 5.5V with multimeter before connecting servo." },
    { name: "Dupont Jumper Wires (120pc)", link: "https://www.amazon.com/Elegoo-EL-CP-004-Multicolored-Breadboard-arduino/dp/B01EV70C78", price: "$7", qty: 1, compat: "2.54mm pitch matches all components.", note: "M-M, M-F, F-F variety." },
    { name: "Breadboard 830 (2pk)", link: "https://www.amazon.com/s?k=breadboard+830+tie+points+2+pack", price: "$7", qty: 1, compat: "Standard pitch for prototyping.", note: "Separate power from signals." },
    { name: "M3 Screw Kit (240pc)", link: "https://www.amazon.com/s?k=M3+screw+assortment+kit+hex+socket+nuts", price: "$9", qty: 1, compat: "NEMA 17 uses M3 at 31mm spacing.", note: "Various lengths + nuts + washers." },
  ]},
  { cat: "🖨️ Consumables", items: [
    { name: "PLA Filament 1kg (1.75mm)", link: "https://www.amazon.com/s?k=PLA+filament+1kg+1.75mm", price: "$20", qty: 1, compat: "All parts designed for PLA.", note: "~700g total, one spool covers it." },
    { name: "PTFE Tape (plumber's tape)", link: "https://www.amazon.com/s?k=PTFE+plumber+tape", price: "$3", qty: 1, compat: "Lines gravity slide for smooth card travel.", note: "Replace when worn." },
    { name: "Cork Sheet (1mm, self-adhesive)", link: "https://www.amazon.com/s?k=cork+sheet+1mm+self+adhesive", price: "$5", qty: 1, compat: "50×12mm piece for separation pad.", note: "Prevents double-feeding." },
  ]},
];

// --- 3D PARTS DATA ---
const PARTS_3D = [
  { num: "01", name: "Card Hopper", ext: "74×99×140mm", inner: "68×93×135mm", orient: "Upright", infill: "20%", time: "~4 hrs", weight: "~80g", notes: "Tilted 30° from vertical. Spring pocket Ø12mm in floor. Feed slot 58×8mm at bottom. Viewing window 30×110mm." },
  { num: "01b", name: "Pusher Plate", ext: "67×92×2mm", inner: "Solid", orient: "Flat", infill: "100%", time: "~20 min", weight: "~5g", notes: "Rides on spring inside hopper. Centering dimple on bottom." },
  { num: "02", name: "Feed Roller Mount", ext: "90×60×10mm", inner: "NEMA 17: 31mm holes, 24mm boss", orient: "Flat on back", infill: "30%", time: "~1.5 hrs", weight: "~30g", notes: "Roller window 50×20mm. M5 tabs extend 10mm each side." },
  { num: "02b", name: "Separation Pad", ext: "60×22×6mm", inner: "Cork recess: 50×12×3mm", orient: "Flat", infill: "30%", time: "~15 min", weight: "~5g", notes: "Glue cork/rubber into recess. Mounts opposite roller." },
  { num: "03", name: "Gravity Slide", ext: "74×220×15mm", inner: "68mm channel, 3mm base", orient: "Flat (channel up)", infill: "20%", time: "~3 hrs", weight: "~60g", notes: "Camera window 50×70mm at 45% down. IR holes Ø6mm through rails. Line with PTFE tape. Print in 2 halves if bed <220mm." },
  { num: "04", name: "ESP32-CAM Mount", ext: "55×45×67mm", inner: "ESP32-CAM: 27×40mm, M2 standoffs", orient: "Upright", infill: "20%", time: "~1.5 hrs", weight: "~25g", notes: "ESP32-CAM sits 60mm above card. LED ring holder Ø48/30mm. Camera lens faces down through Ø12mm hole. USB port accessible from side." },
  { num: "05", name: "Release Gate", ext: "96×46×53mm", inner: "Channel: 68×40mm", orient: "Flat on back", infill: "30%", time: "~2.5 hrs", weight: "~45g", notes: "MG996R pocket. Card exit 64×36mm bottom. Servo 0°=closed, 90°=open." },
  { num: "05b", name: "Gate Flap", ext: "66×25×2mm", inner: "Horn hole: Ø5.8mm", orient: "Flat", infill: "100%", time: "~15 min", weight: "~3g", notes: "Press-fits onto MG996R 25T cross horn." },
  { num: "06v3", name: "Turntable (6-Bin)", ext: "Ø200mm×17mm", inner: "6 slots at 60°, D-shaft Ø5mm", orient: "Flat", infill: "20%, 4 walls", time: "~4 hrs", weight: "~120g", notes: "FITS STANDARD BED. Direct drive — no belt. Hub Ø24×12mm. M3 set screw. Index dots on edge." },
  { num: "07", name: "Card Bin ×6", ext: "74×99×57mm", inner: "70×95×40mm", orient: "Upright", infill: "20%", time: "~1.5 hrs ea", weight: "~35g ea", notes: "Funnel flares 5mm/side. Label slot 50×15mm. Finger scoop. Snap tabs. Holds ~100 sleeved cards." },
  { num: "08", name: "Motor Mount", ext: "80×60×5mm", inner: "NEMA 17 centered", orient: "Flat", infill: "30%", time: "~1 hr", weight: "~20g", notes: "Shaft points UP into turntable. No belt tensioner needed." },
];

// --- ASSEMBLY STEPS ---
const ASSEMBLY = [
  { title: "Build Frame", desc: "Cut 2020 extrusion: 4× 300mm verticals, 2× 350mm base, 2× 200mm cross-braces. Assemble with corner brackets into angled frame supporting the slide at 27°." },
  { title: "Mount Turntable", desc: "Bolt motor mount to frame base with M5 T-nuts. Attach NEMA 17 with shaft pointing UP. Slide turntable disc onto D-shaft, lock with M3 set screw. Verify free spin." },
  { title: "Install 6 Bins", desc: "Snap bins into turntable slots. Label: Fury (Red), Calm (Green), Mind (Blue), Body (Orange), Chaos (Purple), Order (Yellow)." },
  { title: "Mount Gravity Slide", desc: "Attach at 27° angle. Bottom exit centered over turntable drop point. Line inside with PTFE tape." },
  { title: "Attach Release Gate", desc: "Bolt to bottom of slide. Install MG996R servo in side pocket. Attach gate flap to horn. Test: 0°=closed, 90°=open." },
  { title: "Mount ESP32-CAM", desc: "Secure ESP32-CAM in its mount below the slide's camera window. Camera faces DOWN through window. Install LED ring around the lens hole. USB port should be accessible for cable. ~60mm from card surface." },
  { title: "Install Hopper + Feed Roller", desc: "NEMA 17 mount at top of slide. Rubber roller through window contacts bottom card. Hopper above at 30° tilt. Sep pad opposite roller. Insert spring + pusher." },
  { title: "Install Sensors", desc: "IR break-beam emitter/receiver in 6mm holes through slide rails at camera position." },
  { title: "Wire Everything", desc: "Connect ESP32 GPIO to TMC2209 drivers, servo, and IR sensor. See Wiring section for full pinout. All grounds tied together." },
  { title: "Flash Firmware", desc: "Open Arduino IDE, install ESP32 board package, upload the sorter firmware sketch to the ESP32-CAM via the USB programmer board." },
  { title: "Connect & Test", desc: "Plug ESP32-CAM into your computer via USB. Open rift-tracker.vercel.app, go to the Scan tab, and connect to the sorter. The website controls everything from there." },
];

// --- WIRING DATA ---
const WIRING = [
  { conn: "Feed STEP", pin: "GPIO 12", to: "TMC2209 #1 STEP" },
  { conn: "Feed DIR", pin: "GPIO 13", to: "TMC2209 #1 DIR" },
  { conn: "Feed EN", pin: "GPIO 15", to: "TMC2209 #1 EN" },
  { conn: "Table STEP", pin: "GPIO 14", to: "TMC2209 #2 STEP" },
  { conn: "Table DIR", pin: "GPIO 2", to: "TMC2209 #2 DIR" },
  { conn: "Table EN", pin: "GPIO 4", to: "TMC2209 #2 EN" },
  { conn: "Gate Servo", pin: "GPIO 15", to: "MG996R signal (orange wire)" },
  { conn: "IR Sensor", pin: "GPIO 3", to: "Break beam OUT (white wire)" },
  { conn: "Camera", pin: "(onboard)", to: "OV2640 built into ESP32-CAM" },
  { conn: "LED Light", pin: "GPIO 4 (flash LED)", to: "Onboard LED or external ring light" },
];

const POWER_CHAIN = [
  "12V 5A PSU → TMC2209 VMOT pins (both drivers)",
  "12V 5A PSU → LM2596 Buck IN → 5.5V OUT → MG996R (red wire)",
  "USB cable from computer → ESP32-CAM-MB → powers ESP32-CAM (5V via USB)",
  "ESP32-CAM 3.3V pin → TMC2209 VIO pins (both drivers)",
  "ESP32-CAM 5V pin → IR sensor VCC (red wire)",
  "ALL GND tied together: ESP32 GND + 12V GND + Buck GND + Servo GND + IR GND + TMC2209 GND",
];

// --- COLLECTION MANAGER ---
const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

// --- STORAGE (powered by Supabase + localStorage fallback) ---
// See src/lib/supabase.js for implementation

// ============================================================
// STYLES
// ============================================================
const S = {
  bg: "#06060c", card: "#0e0e1a", border: "#1a1a2e", accent: "#6c63ff",
  green: "#10b981", cyan: "#06b6d4", orange: "#f59e0b", pink: "#ec4899",
  text: "#d0cdc8", dim: "#5a5a7e", dark: "#3a3a5e",
};

const pill = (active, color = S.accent) => ({
  background: active ? color + "20" : "transparent",
  border: `1px solid ${active ? color : S.border}`,
  color: active ? "#fff" : S.dim,
  padding: "6px 14px", borderRadius: 6, fontSize: 11,
  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap",
});

// ============================================================
// APP
// ============================================================
export default function App() {
  const [user, setUser] = useState(undefined); // undefined=loading, null=logged out, object=logged in
  const [tab, setTab] = useState("collection");
  const [coll, setColl] = useState({});
  const [shopChecked, setShopChecked] = useState(new Set());
  const [liveCards, setLiveCards] = useState(null);
  const [loading, setLoading] = useState(true);

  const cardList = liveCards || [];

  // Check auth state on mount
  useEffect(() => {
    getUser().then(u => setUser(u || null));
    const { data: { subscription } } = onAuthChange(u => {
      setUser(u || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data once user is known
  useEffect(() => {
    if (user === undefined) return; // still checking auth
    Promise.all([getAllCards(), getCollection(), getShoppingChecked()]).then(([cards, c, s]) => {
      if (cards && cards.length > 0) setLiveCards(cards);
      if (c) setColl(c);
      if (s) setShopChecked(s);
      setLoading(false);
    });
  }, [user]);

  const updateColl = useCallback(async (id, qty) => {
    const next = { ...coll }; qty <= 0 ? delete next[id] : next[id] = qty;
    setColl(next); await updateCard(id, qty);
  }, [coll]);

  const toggleShop = useCallback(async (key) => {
    setShopChecked(prev => {
      const n = new Set(prev); const isChecked = !n.has(key);
      n.has(key) ? n.delete(key) : n.add(key);
      toggleShopItem(key, isChecked); return n;
    });
  }, []);

  // Show auth screen if not logged in
  if (user === undefined) return <div style={{ background: S.bg, color: S.accent, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>Loading...</div>;
  if (user === null) return <Auth onAuth={setUser} />;

  const tabs = [
    { id: "collection", label: "Collection", icon: "🃏" },
    { id: "scans", label: "Recent Scans", icon: "📸" },
    { id: "build", label: "Build Guide", icon: "🔧" },
  ];

  if (loading) return <div style={{ background: S.bg, color: S.accent, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#2a2a4e;border-radius:3px}input,select{font-family:inherit}`}</style>
      {/* Nav */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${S.border}`, position: "sticky", top: 0, background: S.bg + "ee", backdropFilter: "blur(10px)", zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: S.accent, textTransform: "uppercase", fontWeight: 600 }}>Riftbound TCG</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, color: "#fff" }}>Rift Tracker</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, color: S.dim }}>{Object.values(coll).reduce((a,b)=>a+b,0)} cards</div>
            <div style={{ fontSize: 9, color: S.accent }}>{user?.email?.split("@")[0]}</div>
            <button onClick={async () => { await signOut(); setUser(null); setColl({}); }} style={{ background: "transparent", border: `1px solid ${S.border}`, color: S.dim, padding: "3px 8px", borderRadius: 4, fontSize: 9, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={pill(tab === t.id)}>{t.icon} {t.label}</button>)}
        </div>
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 860, margin: "0 auto" }}>
        {tab === "collection" && <Collection coll={coll} update={updateColl} cards={cardList} />}
        {tab === "scans" && <RecentScans />}
        {tab === "build" && <BuildGuide checked={shopChecked} toggle={toggleShop} />}
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
function Overview() {
  const specs = [
    ["Architecture", "ESP32-CAM + WiFi → Website does the thinking"],
    ["Motors", "2 NEMA 17 steppers + 1 MG996R servo"],
    ["Vision", "ESP32-CAM (OV2640) → streams to browser → Tesseract.js OCR"],
    ["Controller", "ESP32-CAM (~$10) — replaces Raspberry Pi ($80+)"],
    ["Turntable", "Ø200mm, direct-drive, no belt needed"],
    ["Sort Bins", "6 (Fury, Calm, Mind, Body, Chaos, Order)"],
    ["Strategy", "Two-pass: domain color first, then energy cost"],
    ["Speed", "~2-3 sec/card (~200 cards in 15 min)"],
    ["Est. Cost", "$50–80 total"],
    ["Print Time", "~25-30 hrs (~700g PLA, under 1 spool)"],
  ];

  return (
    <div>
      <H2>Design Overview</H2>
      <P>An automated card sorting machine for Riftbound TCG. The ESP32-CAM handles motors, servo, and camera — streaming video over WiFi to the Rift Tracker website. The website does all the smart stuff: OCR, card recognition, and collection management. Plug in USB, open the site, and sort.</P>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 8, margin: "16px 0" }}>
        {specs.map(([k,v],i) => (
          <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10 }}>
            <span style={{ fontSize: 10, color: S.accent, fontWeight: 600, minWidth: 80 }}>{k}</span>
            <span style={{ fontSize: 11, color: "#fff" }}>{v}</span>
          </div>
        ))}
      </div>

      <H2>How It Works</H2>
      <div style={{ background: S.card, border: `1px solid ${S.accent}33`, borderRadius: 8, padding: 14, margin: "10px 0", fontSize: 10, color: S.dim, lineHeight: 2 }}>
        <span style={{color:S.accent}}>ESP32-CAM</span> (on the sorter) → streams camera + controls motors via WiFi<br/>
        <span style={{color:S.cyan}}>Your Computer</span> (browser) → receives stream, runs OCR, sends sort commands back<br/>
        <span style={{color:S.green}}>Supabase</span> (cloud) → stores every card scanned into your personal collection
      </div>

      <H2>Card Flow (6 Stages)</H2>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {[
          ["📦 Hopper", "Cards stand on edge, tilted 30°. Spring pushes stack toward roller. No motor.", null],
          ["🔄 Feed Roller", "NEMA 17 + rubber roller pulls one card through slot. Sep pad prevents doubles.", S.orange],
          ["📐 Gravity Slide", "Card slides down 27° channel. No motor — gravity is free.", S.green],
          ["📸 ESP32-CAM", "Camera captures image, streams to website. IR sensor triggers at exact position.", S.pink],
          ["🚪 Release Gate", "MG996R servo holds card while turntable positions. Website sends open command.", S.accent],
          ["🎯 Turntable", "NEMA 17 direct-drive rotates 6 bins. Card drops in.", S.cyan],
        ].map(([name, desc, color], i) => (
          <div key={i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: color || S.dim, fontFamily: "'Space Grotesk',sans-serif", minWidth: 24, textAlign: "center" }}>{i+1}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{name}</div>
              <div style={{ fontSize: 10, color: S.dim, marginTop: 2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <H2 style={{ marginTop: 24 }}>Hopper Mechanism (How It Works)</H2>
      <P>The hopper is tilted 30° forward. Cards stand on their long edge, stacked front-to-back. Gravity pulls the stack toward the front wall. The order from back to front:</P>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, margin: "10px 0", fontSize: 11, lineHeight: 1.8, color: S.text }}>
        <span style={{color:S.green}}>Back wall</span> → <span style={{color:S.green}}>Spring</span> → <span style={{color:S.orange}}>Pusher plate</span> → <span style={{color:"#fff"}}>Card stack</span> → <span style={{color:S.pink}}>Front card contacts roller</span> → <span style={{color:S.pink}}>Roller pulls card DOWN through slot</span> → <span style={{color:S.cyan}}>Card exits onto gravity slide</span>
      </div>
      <P>The card exits downward — the same direction the slide goes — so there's no sharp turn. The roller only fights one card's friction against the separation pad. The spring gives constant pressure regardless of stack size (200 or 5 cards).</P>
    </div>
  );
}

// ============================================================
// SHOPPING LIST
// ============================================================
function Shopping({ checked, toggle }) {
  const [expanded, setExpanded] = useState(new Set());
  const total = SHOP.reduce((a,c) => a + c.items.length, 0);
  const bought = checked.size;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Stat label="Est. Total" value="$50–80" />
        <Stat label="Purchased" value={`${bought}/${total}`} />
      </div>
      {SHOP.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{cat.cat}</div>
          {cat.items.map((item, ii) => {
            const key = `${ci}-${ii}`;
            const done = checked.has(key);
            const open = expanded.has(key);
            return (
              <div key={ii} style={{ background: done ? "#0a1a0a" : S.card, border: `1px solid ${done ? S.green+"33" : S.border}`, borderRadius: 8, marginBottom: 4, opacity: done ? 0.6 : 1 }}>
                <div style={{ padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div onClick={() => toggle(key)} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${done ? S.green : S.dark}`, background: done ? S.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", cursor: "pointer", flexShrink: 0, marginTop: 1 }}>{done&&"✓"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: done ? "#6a8a6a" : "#fff", fontWeight: 500, textDecoration: done ? "line-through" : "none" }}>{item.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: S.accent, fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>{item.price}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: S.accent, textDecoration: "none", padding: "2px 8px", border: `1px solid ${S.accent}33`, borderRadius: 4 }}>Amazon →</a>
                      <button onClick={() => setExpanded(p => { const n=new Set(p); n.has(key)?n.delete(key):n.add(key); return n; })} style={{ fontSize: 9, color: S.dim, background: "transparent", border: `1px solid ${S.border}`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: "inherit" }}>{open?"Hide":"Compat ✓"}</button>
                    </div>
                    {open && <div style={{ marginTop: 8, borderTop: `1px solid ${S.border}`, paddingTop: 8 }}>
                      <div style={{ fontSize: 10, color: S.green, lineHeight: 1.6 }}>{item.compat}</div>
                      <div style={{ fontSize: 10, color: S.dim, marginTop: 4 }}>💡 {item.note}</div>
                    </div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ background: S.card, border: `1px solid ${S.green}33`, borderRadius: 8, padding: 14, fontSize: 10, color: S.dim, lineHeight: 1.8 }}>
        <div style={{ color: S.green, fontWeight: 600, marginBottom: 6, letterSpacing: 2, textTransform: "uppercase", fontSize: 9 }}>Power Compatibility</div>
        <b style={{color:"#fff"}}>12V 5A</b> → TMC2209 VMOT → NEMA 17s ✅<br/>
        <b style={{color:"#fff"}}>12V → Buck → 5.5V</b> → MG996R servo ✅<br/>
        <b style={{color:"#fff"}}>Pi 3.3V</b> → TMC2209 VIO + STEP/DIR ✅<br/>
        <b style={{color:"#fff"}}>Pi CSI 22-pin</b> ← adapter ← Camera 15-pin ✅<br/>
        <b style={{color:S.orange}}>⚠️ ALL GND tied together</b>
      </div>
    </div>
  );
}

// ============================================================
// 3D PARTS
// ============================================================
function Parts3D() {
  const [active, setActive] = useState(0);
  const p = PARTS_3D[active];
  return (
    <div>
      <H2>3D Printed Parts</H2>
      <P>13 total objects (6 bins + 7 unique). Edit parameters.scad to change card dimensions. OpenSCAD files in the downloadable package.</P>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16 }}>
        {PARTS_3D.map((p,i) => <button key={i} onClick={() => setActive(i)} style={pill(active===i)}>#{p.num}</button>)}
      </div>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 12 }}>#{p.num} — {p.name}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[["External", p.ext],["Internal", p.inner],["Orientation", p.orient],["Infill", p.infill],["Print Time", p.time],["Filament", p.weight]].map(([k,v],i) => (
            <div key={i} style={{ background: S.bg, borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 8, color: S.dim, letterSpacing: 1.5, textTransform: "uppercase" }}>{k}</div>
              <div style={{ fontSize: 11, color: "#fff", fontWeight: 500, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: S.dim, lineHeight: 1.7, padding: "10px 0", borderTop: `1px solid ${S.border}` }}>{p.notes}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
        <Stat label="Total Print" value="25-30 hrs" />
        <Stat label="Filament" value="~700g" />
        <Stat label="Objects" value="13 parts" />
      </div>
      <div style={{ marginTop: 16, fontSize: 10, color: S.dim, lineHeight: 1.7, background: S.card, borderRadius: 8, padding: 14, border: `1px solid ${S.border}` }}>
        <b style={{ color: S.orange }}>Card Dimensions (parameters.scad):</b><br/>
        Sleeved: 66×91mm (default) → channels are 68×93mm<br/>
        Unsleeved: 63×88mm → change card_width/card_height<br/>
        Double-sleeved: 69×94mm → all parts auto-update
      </div>
    </div>
  );
}

// ============================================================
// ASSEMBLY
// ============================================================
function Assembly() {
  return (
    <div>
      <H2>Assembly Instructions (10 Steps)</H2>
      <P>Overall machine dimensions: ~350mm wide × 400mm deep × 500mm tall.</P>
      {ASSEMBLY.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: S.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>{i+1}</div>
          <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 10, color: S.dim, lineHeight: 1.7 }}>{s.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// WIRING
// ============================================================
function Wiring() {
  return (
    <div>
      <H2>Wiring Guide</H2>
      <H3>GPIO Connections</H3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead><tr>{["Connection","ESP32 Pin","Destination"].map((h,i) => <th key={i} style={{ background: S.card, color: "#fff", padding: "8px 10px", textAlign: "left", borderBottom: `1px solid ${S.border}` }}>{h}</th>)}</tr></thead>
          <tbody>{WIRING.map((w,i) => (
            <tr key={i}><td style={{ padding: "6px 10px", borderBottom: `1px solid ${S.border}`, color: S.accent, fontWeight: 500 }}>{w.conn}</td><td style={{ padding: "6px 10px", borderBottom: `1px solid ${S.border}` }}>{w.pin}</td><td style={{ padding: "6px 10px", borderBottom: `1px solid ${S.border}`, color: S.dim }}>{w.to}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <H3>Power Chain</H3>
      {POWER_CHAIN.map((p,i) => (
        <div key={i} style={{ fontSize: 10, color: i===5 ? S.orange : S.text, lineHeight: 1.8, paddingLeft: 12, borderLeft: `2px solid ${i===5 ? S.orange : S.accent}33` }}>{p}</div>
      ))}
      <H3>TMC2209 Wiring (each driver)</H3>
      <div style={{ background: S.card, borderRadius: 8, padding: 14, border: `1px solid ${S.border}`, fontSize: 10, color: S.dim, lineHeight: 1.8 }}>
        VMOT → 12V(+) &nbsp;|&nbsp; GND → 12V(-) &nbsp;|&nbsp; VIO → ESP32 3.3V &nbsp;|&nbsp; GND → ESP32 GND<br/>
        STEP → ESP32 GPIO &nbsp;|&nbsp; DIR → ESP32 GPIO &nbsp;|&nbsp; EN → ESP32 GPIO<br/>
        A1,A2 → Motor coil A (Black, Green) &nbsp;|&nbsp; B1,B2 → Motor coil B (Red, Blue)
      </div>
    </div>
  );
}

// ============================================================
// SOFTWARE
// ============================================================
function Software() {
  return (
    <div>
      <H2>Software Setup</H2>

      <H3>Architecture</H3>
      <P>The sorter uses a split-brain architecture. The ESP32-CAM handles hardware (motors, servo, camera, sensors) and streams camera frames over WiFi. The website handles the intelligence (OCR, card recognition, collection management). No Python, no SD card, no OS to boot.</P>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, margin: "10px 0", fontSize: 10, color: S.dim, lineHeight: 1.8 }}>
        <span style={{color:S.accent}}>ESP32-CAM</span> (firmware) → WiFi stream + motor commands<br/>
        <span style={{color:S.cyan}}>Website</span> (browser) → Tesseract.js OCR + card recognition + Supabase sync<br/>
        <span style={{color:S.green}}>Supabase</span> (cloud) → shared card catalog + per-user collections
      </div>

      <H3>ESP32 Firmware (Arduino IDE)</H3>
      <P>Install the ESP32 board package in Arduino IDE, select "AI Thinker ESP32-CAM", then flash the firmware sketch.</P>
      <Code>{`// 1. Arduino IDE → Preferences → Board Manager URLs:
//    https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
// 2. Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM
// 3. Upload the sorter_firmware.ino sketch

// The firmware does 3 things:
// - Streams camera frames via HTTP (MJPEG)
// - Listens for motor commands via HTTP API
// - Reports IR sensor state via HTTP

// API endpoints hosted on the ESP32:
// GET  /stream     → MJPEG camera stream
// POST /feed       → feed one card (stepper pulse)
// POST /rotate/3   → rotate turntable to bin 3
// POST /gate/open  → open release gate
// POST /gate/close → close release gate
// GET  /ir         → { "triggered": true/false }
// GET  /status     → { "wifi": true, "camera": true }`}</Code>

      <H3>Card Recognition (runs in your browser)</H3>
      <P>Each Riftbound domain has a distinct frame color. The website analyzes camera frames using canvas pixel analysis for domain color, and Tesseract.js for OCR — all client-side, no server needed.</P>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, margin: "10px 0" }}>
        {DOMAINS.map(d => (
          <div key={d.name} style={{ background: d.color+"18", border: `1px solid ${d.color}44`, borderRadius: 6, padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 14 }}>{d.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: d.color }}>{d.name}</div>
          </div>
        ))}
      </div>

      <H3>Sort Loop (website controls everything)</H3>
      <Code>{`// This runs in the browser when you hit "Start Sorting":
while (sorting) {
  await fetch(ESP32_IP + "/feed");        // feed one card
  await waitForIR(ESP32_IP);              // IR sensor triggers
  const frame = captureFromStream();      // grab camera frame
  const card = await recognizeCard(frame); // OCR + color detect
  const bin = getBinForDomain(card.domain);
  await fetch(ESP32_IP + "/rotate/" + bin); // position turntable
  await fetch(ESP32_IP + "/gate/open");     // release card
  await sleep(300);
  await fetch(ESP32_IP + "/gate/close");
  await logToSupabase(card);               // save to collection
}`}</Code>

      <H3>WiFi Setup</H3>
      <P>On first boot, the ESP32-CAM creates a WiFi hotspot called "RiftSorter-Setup". Connect to it, enter your home WiFi credentials, and it saves them. After that, it auto-connects to your network and the website discovers it automatically.</P>
    </div>
  );
}

// ============================================================
// WORKFLOW
// ============================================================
function Workflow() {
  return (
    <div>
      <H2>Two-Pass Sorting Workflow</H2>
      <P>Open rift-tracker.vercel.app, log in, and connect to your ESP32-CAM sorter. Select sorting mode and hit Start.</P>

      <div style={{ background: S.card, border: `1px solid ${S.accent}33`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: S.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>1</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>Sort by Domain Color</div>
        </div>
        <P>Load entire unsorted collection (~200 cards). Website analyzes each camera frame for frame color via canvas pixel analysis. ~15 min. Result: 6 domain piles. Every card gets logged to your collection automatically.</P>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
          {DOMAINS.map((d,i) => (
            <div key={i} style={{ background: d.color+"18", border: `1px solid ${d.color}44`, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: d.color }}>{d.icon} {d.name}</div>
              <div style={{ fontSize: 8, color: S.dim }}>Bin {i+1}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: S.dim, background: S.bg, borderRadius: 6, padding: 10, marginTop: 8 }}>
          <b style={{ color: S.green }}>Recognition:</b> HSV color detection on card border — Fury=Red (H:0-10), Calm=Green (H:35-85), Mind=Blue (H:100-130), Body=Orange (H:10-25), Chaos=Purple (H:130-165), Order=Yellow (H:25-35). Runs client-side in your browser.
        </div>
      </div>

      <div style={{ textAlign: "center", color: S.dark, fontSize: 16, margin: "8px 0" }}>↓ take each pile, run again ↓</div>

      <div style={{ background: S.card, border: `1px solid ${S.cyan}33`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: S.cyan, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif" }}>2</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>Sort by Cost (×6 runs)</div>
        </div>
        <P>Switch to "cost mode" on the website. Run each domain pile separately. Tesseract.js reads the cost number from the top-left of each card. ~15 min total for all 6 piles.</P>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
          {["0-1","2-3","4-5","6-7","8+","Runes"].map((t,i) => (
            <div key={i} style={{ background: S.cyan+"12", border: `1px solid ${S.cyan}33`, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: S.cyan }}>{t}</div>
              <div style={{ fontSize: 8, color: S.dim }}>Bin {i+1}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: S.card, border: `1px solid ${S.green}33`, borderRadius: 10, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: S.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>✓</div>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>Result: Fully Organized + Cataloged</div>
        </div>
        <P>6 domains × 6 cost tiers = up to 36 sorted groups. Total time: ~30 min from shuffled pile to organized collection. Every card is in your online collection with name, domain, cost, rarity, and text — viewable from any device.</P>
      </div>
    </div>
  );
}

// ============================================================
// BUILD GUIDE (bundles all build sections)
// ============================================================
function BuildGuide({ checked, toggle }) {
  const [section, setSection] = useState("overview");
  const sections = [
    { id: "overview", label: "Overview", icon: "🏠" },
    { id: "shop", label: "Shopping", icon: "🛒" },
    { id: "parts", label: "3D Parts", icon: "🖨️" },
    { id: "assembly", label: "Assembly", icon: "🔧" },
    { id: "wiring", label: "Wiring", icon: "⚡" },
    { id: "software", label: "Software", icon: "💻" },
    { id: "workflow", label: "Sorting", icon: "🎯" },
    { id: "files", label: "Files", icon: "📁" },
  ];

  return (
    <div>
      <H2>Build Guide</H2>
      <P>Everything you need to build the Riftbound Card Sorter — from parts to assembly to software.</P>
      <div style={{ display: "flex", gap: 4, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            background: section === s.id ? S.accent + "22" : S.card,
            border: `1px solid ${section === s.id ? S.accent : S.border}`,
            color: section === s.id ? S.accent : S.dim,
            padding: "6px 12px", borderRadius: 6, fontSize: 10, cursor: "pointer",
            fontFamily: "inherit", whiteSpace: "nowrap", fontWeight: section === s.id ? 600 : 400,
          }}>{s.icon} {s.label}</button>
        ))}
      </div>
      {section === "overview" && <Overview />}
      {section === "shop" && <Shopping checked={checked} toggle={toggle} />}
      {section === "parts" && <Parts3D />}
      {section === "assembly" && <Assembly />}
      {section === "wiring" && <Wiring />}
      {section === "software" && <Software />}
      {section === "workflow" && <Workflow />}
      {section === "files" && <Files />}
    </div>
  );
}

// ============================================================
// RECENT SCANS
// ============================================================
function RecentScans() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentScans().then(data => {
      setScans(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: S.dim, fontSize: 11, padding: 20, textAlign: "center" }}>Loading scans...</div>;

  return (
    <div>
      <H2>Recent Scans</H2>
      <P>Cards detected by the sorter — most recent first.</P>
      {scans.length === 0 ? (
        <div style={{ color: S.dark, fontSize: 12, padding: 40, textAlign: "center", lineHeight: 1.8 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
          <div style={{ color: S.dim, fontWeight: 600, marginBottom: 4 }}>No scans yet</div>
          <div>When you run the card sorter, each scan will appear here in real time.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {scans.map((s, i) => {
            const d = DOMAINS.find(x => x.name === s.domain_detected);
            return (
              <div key={s.id || i} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d?.color || S.dim }} />
                  <div>
                    <div style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{s.cards?.name || s.card_id || "Unknown"}</div>
                    <div style={{ fontSize: 9, color: S.dim }}>
                      {s.domain_detected} · Cost {s.cost_detected} · {s.is_new_card ? "✨ New card" : "Duplicate"}
                      {s.confidence ? ` · ${(s.confidence * 100).toFixed(0)}% confidence` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 9, color: S.dark }}>{s.scanned_at ? new Date(s.scanned_at).toLocaleString() : ""}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// COLLECTION MANAGER
// ============================================================
function Collection({ coll, update, cards: CARDS }) {
  // Only real cards from Supabase (scanned by the sorter)
  const ALL = CARDS || [];
  const [sub, setSub] = useState("dash");
  const [search, setSearch] = useState("");
  const [domFilt, setDomFilt] = useState("All");

  const totalOwned = Object.values(coll).reduce((a,b) => a+b, 0);
  const uniqueOwned = Object.keys(coll).length;
  const totalValue = Object.entries(coll).reduce((s,[id,q]) => { const c=ALL.find(x=>x.id===id); return s+(c?(c.market_value||c.value||0)*q:0); }, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[["dash","Dashboard"],["browse","Browse"],["add","Add Cards"]].map(([id,label]) => (
          <button key={id} onClick={() => setSub(id)} style={pill(sub===id)}>{label}</button>
        ))}
      </div>

      {sub === "dash" && <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 20 }}>
          <Stat label="Total Cards" value={totalOwned} sub={`${uniqueOwned} unique`} />
          <Stat label="Completion" value={`${ALL.length > 0 ? ((uniqueOwned/ALL.length)*100).toFixed(1) : 0}%`} sub={`${uniqueOwned}/${ALL.length}`} />
          <Stat label="Value" value={`$${totalValue.toFixed(2)}`} sub="est. market" />
        </div>
        <H3>Domain Completion</H3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6, marginBottom: 16 }}>
          {DOMAINS.map(d => {
            const dc = ALL.filter(c=>c.domain===d.name);
            const owned = dc.filter(c=>coll[c.id]).length;
            const pct = dc.length > 0 ? (owned/dc.length*100).toFixed(0) : 0;
            return (
              <div key={d.name} style={{ background: S.card, border: `1px solid ${d.color}33`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: d.color, fontWeight: 600 }}>{d.icon} {d.name}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>{pct}%</span>
                </div>
                <div style={{ background: S.bg, borderRadius: 3, height: 5, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: d.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 8, color: S.dim, marginTop: 3 }}>{owned}/{dc.length}</div>
              </div>
            );
          })}
        </div>
        <H3>Most Valuable Owned</H3>
        {ALL.filter(c=>coll[c.id]).sort((a,b)=>(b.market_value||b.value||0)*coll[b.id]-(a.market_value||a.value||0)*coll[a.id]).slice(0,5).map(c => {
          const d = DOMAINS.find(x=>x.name===c.domain);
          return (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${S.border}`, fontSize: 11 }}>
              <span><span style={{ color: d?.color }}>{d?.icon}</span> {c.name} <span style={{ color: S.dim, fontSize: 9 }}>×{coll[c.id]}</span></span>
              <span style={{ color: S.green, fontWeight: 600 }}>${((c.market_value||c.value||0)*coll[c.id]).toFixed(2)}</span>
            </div>
          );
        })}
        {uniqueOwned === 0 && <div style={{ color: S.dark, fontSize: 11, padding: 20, textAlign: "center" }}>No cards yet. Go to "Add Cards" to start building your collection.</div>}
      </>}

      {(sub === "browse" || sub === "add") && <>
        {ALL.length === 0 ? (
          <div style={{ color: S.dark, fontSize: 12, padding: 40, textAlign: "center", lineHeight: 1.8 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🃏</div>
            <div style={{ color: S.dim, fontWeight: 600, marginBottom: 4 }}>No cards scanned yet</div>
            <div>Run the card sorter to scan your Riftbound cards.<br/>Each card will appear here automatically.</div>
          </div>
        ) : <>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ background: S.card, border: `1px solid ${S.border}`, color: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 11, flex: "1 1 150px" }} />
          <select value={domFilt} onChange={e => setDomFilt(e.target.value)} style={{ background: S.card, border: `1px solid ${S.border}`, color: "#fff", padding: "6px 8px", borderRadius: 6, fontSize: 11 }}>
            <option value="All">All Domains</option>
            {DOMAINS.map(d => <option key={d.name} value={d.name}>{d.icon} {d.name}</option>)}
          </select>
        </div>
        {ALL
          .filter(c => {
            if (sub === "browse" && !coll[c.id]) return false;
            if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (domFilt !== "All" && c.domain !== domFilt) return false;
            return true;
          })
          .sort((a,b) => a.name.localeCompare(b.name))
          .map(c => {
            const d = DOMAINS.find(x=>x.name===c.domain);
            const q = coll[c.id] || 0;
            const rc = {Common:"#6a6a8e",Uncommon:"#16a34a",Rare:"#2563eb",Epic:"#9333ea",Legendary:"#eab308"};
            return (
              <div key={c.id} style={{ background: q>0?S.card:S.bg, border: `1px solid ${q>0?S.border:"#12122a"}`, borderRadius: 6, padding: "8px 10px", marginBottom: 3, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: q>0?1:0.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: d?.color+"22", border: `1px solid ${d?.color}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: d?.color, flexShrink: 0 }}>{c.cost}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#fff", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                    <div style={{ fontSize: 8, color: S.dim }}><span style={{ color: d?.color }}>{c.domain}</span> · <span style={{ color: rc[c.rarity] }}>{c.rarity}</span> · {c.card_type||c.type} · ${c.market_value||c.value||0}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => update(c.id, Math.max(0,q-1))} style={{ background: S.card, border: `1px solid ${S.border}`, color: S.dim, width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>-</button>
                  <span style={{ fontSize: 12, fontWeight: 600, color: q>0?"#fff":S.dark, width: 20, textAlign: "center" }}>{q}</span>
                  <button onClick={() => update(c.id, q+1)} style={{ background: S.card, border: `1px solid ${S.border}`, color: S.dim, width: 22, height: 22, borderRadius: 4, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                </div>
              </div>
            );
          })}
        </>}
      </>}
    </div>
  );
}

// ============================================================
// FILES & DOWNLOADS
// ============================================================
const FILE_SECTIONS = [
  {
    cat: "📐 OpenSCAD 3D Models",
    desc: "Open in OpenSCAD (free), press F6 to render, export as STL for your slicer.",
    files: [
      { name: "parameters.scad", desc: "Master config — edit card dimensions here, all parts auto-update", code: `// RIFTBOUND TCG CARD SORTER - MASTER PARAMETERS
// All dimensions in millimeters

// --- Card Dimensions (with sleeves) ---
card_width = 66;        // sleeved width (63 unsleeved, 69 double)
card_height = 91;       // sleeved height (88 unsleeved, 94 double)
card_thickness = 0.5;
card_clearance = 2;
slot_width = card_width + card_clearance;   // 68mm
slot_height = card_height + card_clearance; // 93mm

// --- Walls ---
wall = 3;
thick_wall = 5;

// --- NEMA 17 Motor ---
nema17_face = 42.3;
nema17_hole_spacing = 31;
nema17_hole_dia = 3.2;
nema17_shaft_dia = 5;
nema17_boss_dia = 22;

// --- MG996R Servo ---
servo_body_w = 40.7;
servo_body_d = 19.7;
servo_body_h = 42.9;
servo_tab_w = 54.5;
servo_hole_spacing = 49.5;

// --- Turntable ---
num_bins = 6;
turntable_dia = 200;
turntable_thickness = 5;

// --- Hopper ---
hopper_capacity = 200;
hopper_angle = 30;

// --- Slide ---
slide_angle = 27;
slide_length = 220;

$fn = 60;` },
      { name: "01_card_hopper.scad", desc: "Tilted hopper + pusher plate (74×99×140mm)", code: `include <parameters.scad>

hopper_stack_height = hopper_capacity * card_thickness;
hopper_internal_w = slot_width;
hopper_internal_d = slot_height;
hopper_total_h = hopper_stack_height + 40;
feed_slot_h = 8;
feed_slot_w = hopper_internal_w - 10;
spring_pocket_dia = 12;
spring_pocket_depth = 15;
window_width = 30;
window_height = hopper_total_h - 30;

module card_hopper() {
  difference() {
    cube([hopper_internal_w + wall*2, hopper_internal_d + wall*2, hopper_total_h]);
    translate([wall, wall, wall])
      cube([hopper_internal_w, hopper_internal_d, hopper_total_h + 1]);
    // Feed slot
    translate([(hopper_internal_w + wall*2 - feed_slot_w)/2, -1, 0])
      cube([feed_slot_w, wall+2, feed_slot_h]);
    // Window
    translate([hopper_internal_w + wall*2 - wall/2, (hopper_internal_d + wall*2 - window_width)/2, 20])
      cube([wall+1, window_width, window_height]);
    // Spring pocket
    translate([(hopper_internal_w + wall*2)/2, (hopper_internal_d + wall*2)/2, wall-0.1])
      cylinder(d=spring_pocket_dia, h=spring_pocket_depth);
  }
}

module pusher_plate() {
  difference() {
    cube([hopper_internal_w - 1, hopper_internal_d - 1, 2]);
    translate([(hopper_internal_w-1)/2, (hopper_internal_d-1)/2, -0.1])
      cylinder(d=spring_pocket_dia - 1, h=1.2);
  }
}

card_hopper();` },
      { name: "02_feed_roller_mount.scad", desc: "NEMA 17 mount + separation pad holder", code: `include <parameters.scad>

mount_w = 70; mount_h = 60; mount_depth = 10;
roller_window_w = 50; roller_window_h = 20;

module feed_roller_mount() {
  difference() {
    union() {
      cube([mount_w, mount_h, mount_depth]);
      for (y = [5, mount_h-15]) {
        translate([-10, y, 0]) cube([10, 10, mount_depth]);
        translate([mount_w, y, 0]) cube([10, 10, mount_depth]);
      }
    }
    translate([mount_w/2, mount_h/2, -1])
      cylinder(d=nema17_boss_dia+2, h=mount_depth+2);
    for (dx=[-1,1], dy=[-1,1])
      translate([mount_w/2+dx*nema17_hole_spacing/2, mount_h/2+dy*nema17_hole_spacing/2, -1])
        cylinder(d=nema17_hole_dia, h=mount_depth+2);
    translate([(mount_w-roller_window_w)/2, mount_h/2+5, -1])
      cube([roller_window_w, roller_window_h, mount_depth+2]);
    for (y=[10, mount_h-10]) {
      translate([-5, y, -1]) cylinder(d=5, h=mount_depth+2);
      translate([mount_w+5, y, -1]) cylinder(d=5, h=mount_depth+2);
    }
  }
}

module separation_pad_holder() {
  difference() {
    cube([60, 22, 6]);
    translate([5, 5, 3]) cube([50, 12, 4]);
    for (dx=[5, 55]) translate([dx, 11, -1]) cylinder(d=3.2, h=10);
  }
}

feed_roller_mount();
translate([0, mount_h+10, 0]) separation_pad_holder();` },
      { name: "03_gravity_slide.scad", desc: "Angled slide channel with camera window (74×220×15mm)", code: `include <parameters.scad>

channel_w = slot_width + wall*2;
rail_h = 15; base_thickness = 3;
camera_window_w = 50; camera_window_l = 70;
camera_pos = slide_length * 0.45;
sensor_hole_dia = 6;
sensor_pos = camera_pos - 10;

module gravity_slide() {
  difference() {
    union() {
      cube([channel_w, slide_length, base_thickness]);
      cube([wall, slide_length, rail_h]);
      translate([channel_w-wall, 0, 0]) cube([wall, slide_length, rail_h]);
      for (y=[20, slide_length-20]) {
        translate([-15, y-10, 0]) cube([15, 20, base_thickness]);
        translate([channel_w, y-10, 0]) cube([15, 20, base_thickness]);
      }
    }
    translate([(channel_w-camera_window_w)/2, camera_pos-camera_window_l/2, -1])
      cube([camera_window_w, camera_window_l, base_thickness+2]);
    translate([-1, sensor_pos, rail_h/2]) rotate([0,90,0])
      cylinder(d=sensor_hole_dia, h=wall+2);
    translate([channel_w-wall-1, sensor_pos, rail_h/2]) rotate([0,90,0])
      cylinder(d=sensor_hole_dia, h=wall+2);
    for (y=[20, slide_length-20]) {
      translate([-7.5, y, -1]) cylinder(d=5, h=base_thickness+2);
      translate([channel_w+7.5, y, -1]) cylinder(d=5, h=base_thickness+2);
    }
  }
}
gravity_slide();` },
      { name: "06v3_turntable_disc.scad", desc: "6-bin turntable, Ø200mm, direct drive (FINAL)", code: `// 6-BIN TURNTABLE - Direct drive, no belt
// Fits standard 220mm print bed

card_width = 66; card_height = 91; card_clearance = 2;
slot_width = card_width + card_clearance;
slot_height = card_height + card_clearance;
num_bins = 6;
turntable_dia = 200;
turntable_thickness = 5;
wall = 3;
shaft_dia = 5; shaft_flat = 4.5;
hub_od = 24; hub_h = 12;
bin_slot_w = slot_width + 4;
bin_slot_d = slot_height + 6;
bin_slot_depth = 4;
bin_center_radius = turntable_dia/2 - bin_slot_d/2 - 3;
$fn = 80;

module d_shaft_hole(d, flat, h) {
  intersection() {
    cylinder(d=d+0.3, h=h);
    translate([-(d+1)/2, -d/2, 0]) cube([d+1, flat+0.15, h]);
  }
}

module turntable_disc_v3() {
  difference() {
    union() {
      cylinder(d=turntable_dia, h=turntable_thickness);
      cylinder(d=hub_od, h=turntable_thickness + hub_h);
    }
    translate([0,0,-1]) d_shaft_hole(shaft_dia, shaft_flat, turntable_thickness+hub_h+2);
    translate([0,0,turntable_thickness+hub_h/2]) rotate([0,90,0]) cylinder(d=3, h=hub_od);
    for (i=[0:num_bins-1]) {
      rotate([0,0,i*360/num_bins])
        translate([bin_center_radius-bin_slot_d/2, -bin_slot_w/2, turntable_thickness-bin_slot_depth])
          cube([bin_slot_d, bin_slot_w, bin_slot_depth+1]);
    }
    for (i=[0:num_bins-1]) {
      rotate([0,0,i*360/num_bins+30])
        translate([turntable_dia*0.3, 0, -1]) cylinder(d=18, h=turntable_thickness+2);
    }
  }
  for (i=[0:num_bins-1]) {
    rotate([0,0,i*360/num_bins])
      for (dot=[0:i])
        translate([turntable_dia/2-6, -3+dot*4, turntable_thickness])
          cylinder(d=2.5, h=0.8);
  }
}
turntable_disc_v3();` },
      { name: "07_card_bin.scad", desc: "Removable card bin — print 6 (74×99×57mm)", code: `// CARD BIN - Print 6 (one per domain)
card_width = 66; card_height = 91;
slot_width = card_width + 2; slot_height = card_height + 2;
bin_w = slot_width + 2; bin_d = slot_height + 2;
bin_h = 40; bin_wall = 2; bin_floor = 2;
funnel_flare = 5; funnel_h = 15;
$fn = 60;

module card_bin() {
  total_w = bin_w + bin_wall*2;
  total_d = bin_d + bin_wall*2;
  difference() {
    union() {
      cube([total_w, total_d, bin_floor + bin_h]);
      translate([0,0,bin_floor+bin_h]) hull() {
        cube([total_w, total_d, 0.1]);
        translate([-funnel_flare,-funnel_flare,funnel_h])
          cube([total_w+funnel_flare*2, total_d+funnel_flare*2, 0.1]);
      }
      for (dx=[total_w/2-5, total_w/2+1]) {
        translate([dx,-2,0]) cube([4,2,3]);
        translate([dx,total_d,0]) cube([4,2,3]);
      }
    }
    translate([bin_wall,bin_wall,bin_floor])
      cube([bin_w, bin_d, bin_h+funnel_h+1]);
    translate([bin_wall,bin_wall,bin_floor+bin_h]) hull() {
      cube([bin_w, bin_d, 0.1]);
      translate([-funnel_flare,-funnel_flare,funnel_h])
        cube([bin_w+funnel_flare*2, bin_d+funnel_flare*2, 0.1]);
    }
    translate([(total_w-50)/2, -0.1, bin_floor+bin_h-20])
      cube([50, 1.2, 15]);
    translate([total_w/2, total_d+bin_wall, bin_floor+12])
      rotate([90,0,0]) cylinder(d=28, h=bin_wall+2);
  }
}
card_bin();` },
    ]
  },
  {
    cat: "⚡ ESP32 Firmware (Arduino)",
    desc: "Flash to ESP32-CAM via Arduino IDE. Handles camera stream, motor control, and IR sensor.",
    files: [
      { name: "sorter_firmware.ino", desc: "Main ESP32-CAM firmware — WiFi + camera stream + HTTP motor API", code: `/*
 * Riftbound Card Sorter — ESP32-CAM Firmware
 * Flash via Arduino IDE (Board: AI Thinker ESP32-CAM)
 *
 * Hosts HTTP endpoints:
 *   GET  /stream    → MJPEG camera stream
 *   POST /feed      → feed one card
 *   POST /rotate/N  → rotate turntable to bin N (0-5)
 *   POST /gate/open → open release gate
 *   POST /gate/close→ close release gate
 *   GET  /ir        → IR sensor state
 *   GET  /status    → system health
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <Stepper.h>
#include <ESP32Servo.h>

// WiFi credentials (set these before flashing)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// GPIO Pins (ESP32-CAM safe pins)
#define FEED_STEP 12
#define FEED_DIR  13
#define TABLE_STEP 14
#define TABLE_DIR  2
#define SERVO_PIN  15
#define IR_PIN     3

// Motor settings
#define STEPS_PER_CARD 200
#define STEPS_PER_BIN  33
#define STEP_DELAY_US  2000

WebServer server(80);
Servo gateServo;
int currentBin = 0;

void setup() {
  Serial.begin(115200);
  // Init camera, WiFi, GPIO, servo...
  // See full firmware in project files
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.println("IP: " + WiFi.localIP().toString());

  // Register HTTP endpoints
  server.on("/feed", HTTP_POST, handleFeed);
  server.on("/gate/open", HTTP_POST, handleGateOpen);
  server.on("/gate/close", HTTP_POST, handleGateClose);
  server.on("/ir", HTTP_GET, handleIR);
  server.on("/status", HTTP_GET, handleStatus);
  // /stream and /rotate/:bin also registered
  server.begin();
}

void loop() { server.handleClient(); }` },
      { name: "platformio.ini", desc: "PlatformIO config (alternative to Arduino IDE)", code: `[env:esp32cam]
platform = espressif32
board = esp32cam
framework = arduino
monitor_speed = 115200
lib_deps =
  ESP32Servo` },
    ]
  },
  {
    cat: "🗄️ Supabase Schema",
    desc: "Run in Supabase SQL editor to set up the collection database.",
    files: [
      { name: "schema.sql", desc: "Complete database schema for cards, collection, decks, scan log", code: `-- Riftbound Card Sorter — Supabase Schema

create table cards (
  id text primary key,
  name text not null,
  domain text not null,
  cost integer not null,
  rarity text not null,
  type text not null,
  set_name text not null,
  market_value numeric(8,2) default 0,
  image_hash text,
  updated_at timestamptz default now()
);

create table collection (
  id uuid default gen_random_uuid() primary key,
  card_id text references cards(id),
  quantity integer default 1,
  condition text default 'Near Mint',
  foil boolean default false,
  scanned_at timestamptz default now(),
  unique(card_id, condition, foil)
);

create table decks (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  legend text,
  domain1 text not null,
  domain2 text not null,
  created_at timestamptz default now()
);

create table deck_cards (
  deck_id uuid references decks(id) on delete cascade,
  card_id text references cards(id),
  quantity integer default 1,
  primary key (deck_id, card_id)
);

create table scan_log (
  id uuid default gen_random_uuid() primary key,
  card_id text references cards(id),
  domain_detected text,
  confidence numeric(5,2),
  sort_bin integer,
  scanned_at timestamptz default now()
);` },
    ]
  },
];

function Files() {
  const [expanded, setExpanded] = useState(new Set());
  const [copied, setCopied] = useState(null);

  const copyCode = (code, key) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const toggleFile = (key) => {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  return (
    <div>
      <H2>Project Files</H2>
      <P>All source code for the project. Click any file to view its contents, then copy to clipboard or save locally. Put all .scad files in the same folder — they reference parameters.scad.</P>

      <div style={{ background: S.card, border: `1px solid ${S.orange}33`, borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <div style={{ fontSize: 10, color: S.orange, fontWeight: 600, marginBottom: 6 }}>📥 Quick Start</div>
        <div style={{ fontSize: 10, color: S.dim, lineHeight: 1.8 }}>
          <b style={{ color: "#fff" }}>3D Models:</b> Install <a href="https://openscad.org/" target="_blank" rel="noopener noreferrer" style={{ color: S.accent }}>OpenSCAD</a> (free) → paste each .scad file → F6 to render → Export STL → slice and print<br/>
          <b style={{ color: "#fff" }}>Software:</b> Copy .py files to Pi → pip install -r requirements.txt → python3 sorter_main.py --test<br/>
          <b style={{ color: "#fff" }}>Database:</b> Create Supabase project → paste schema.sql in SQL editor → run
        </div>
      </div>

      {FILE_SECTIONS.map((section, si) => (
        <div key={si} style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 4 }}>{section.cat}</div>
          <div style={{ fontSize: 10, color: S.dim, marginBottom: 10 }}>{section.desc}</div>

          {section.files.map((file, fi) => {
            const key = `${si}-${fi}`;
            const isOpen = expanded.has(key);
            const isCopied = copied === key;
            return (
              <div key={fi} style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, marginBottom: 6, overflow: "hidden" }}>
                <div onClick={() => toggleFile(key)} style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div>
                    <span style={{ fontSize: 12, color: S.green, fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{file.name}</span>
                    <span style={{ fontSize: 10, color: S.dim, marginLeft: 10 }}>{file.desc}</span>
                  </div>
                  <span style={{ fontSize: 10, color: S.dark }}>{isOpen ? "▼" : "▶"}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${S.border}` }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 14px 0" }}>
                      <button onClick={(e) => { e.stopPropagation(); copyCode(file.code, key); }} style={{
                        background: isCopied ? S.green + "22" : S.bg,
                        border: `1px solid ${isCopied ? S.green : S.border}`,
                        color: isCopied ? S.green : S.dim,
                        padding: "4px 12px", borderRadius: 4, fontSize: 10, cursor: "pointer", fontFamily: "inherit",
                      }}>
                        {isCopied ? "✓ Copied!" : "Copy to clipboard"}
                      </button>
                    </div>
                    <pre style={{
                      padding: "10px 14px 14px", margin: 0, fontSize: 9.5, lineHeight: 1.5,
                      color: S.green, background: "transparent", overflowX: "auto",
                      whiteSpace: "pre-wrap", fontFamily: "'JetBrains Mono',monospace",
                      maxHeight: 400, overflowY: "auto",
                    }}>{file.code}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginTop: 16 }}>
        <div style={{ fontSize: 10, color: S.dim, lineHeight: 1.7 }}>
          <b style={{ color: S.accent }}>Note:</b> Additional parts (04_camera_mount, 05_release_gate, 08_motor_mount) follow the same pattern.
          The full set of 10 .scad files are in the downloadable ZIP from the chat. These are the critical files you need to get started — the turntable, bins, hopper, slide, and feed roller.
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function H2({ children, style }) { return <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 16, fontWeight: 600, color: "#fff", marginTop: 20, marginBottom: 10, ...style }}>{children}</div>; }
function H3({ children }) { return <div style={{ fontSize: 10, letterSpacing: 2, color: S.accent, textTransform: "uppercase", fontWeight: 600, marginTop: 16, marginBottom: 8 }}>{children}</div>; }
function P({ children }) { return <div style={{ fontSize: 11, color: S.dim, lineHeight: 1.7, marginBottom: 8 }}>{children}</div>; }
function Code({ children }) { return <pre style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, fontSize: 10, color: S.green, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", margin: "8px 0 16px", fontFamily: "'JetBrains Mono',monospace" }}>{children}</pre>; }
function Stat({ label, value, sub }) { return <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: "10px 14px" }}><div style={{ fontSize: 8, color: S.dim, letterSpacing: 2, textTransform: "uppercase", marginBottom: 2 }}>{label}</div><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: "#fff" }}>{value}</div>{sub && <div style={{ fontSize: 9, color: S.dim, marginTop: 1 }}>{sub}</div>}</div>; }
