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
  { cat: "🔩 Structure & Hardware", items: [
    { name: "Clear Acrylic Sheet 3mm (A4 size)", link: "https://www.amazon.com/s?k=clear+acrylic+sheet+3mm+A4", price: "$8", qty: 1, compat: "Cut a 56×79mm piece for the camera window in the card bridge. Card slides over it, camera reads through it.", note: "Must be optically clear — no frosted/matte finish. Laser-cut or score-and-snap." },
    { name: "4mm Dowel Pins (50mm long, 10pk)", link: "https://www.amazon.com/s?k=4mm+dowel+pin+50mm+steel", price: "$6", qty: 1, compat: "3 pins align the two turntable halves on the split line.", note: "Steel or stainless. Press-fit into Ø4mm holes." },
    { name: "608ZZ Bearing (skateboard bearing)", link: "https://www.amazon.com/s?k=608ZZ+bearing+skateboard", price: "$5", qty: 1, compat: "8mm bore, 22mm OD. Optional: sits between center column flange and turntable for smooth rotation.", note: "Or use PTFE washers for a simpler low-friction surface." },
  ]},
  { cat: "🔄 Card Feed", items: [
    { name: "Silicone Roller Wheel (25-30mm, 5mm bore)", link: "https://www.amazon.com/s?k=silicone+rubber+wheel+5mm+bore+25mm", price: "$8", qty: 1, compat: "5mm bore fits NEMA 17 shaft directly.", note: "Or 3D print a hub + wrap with rubber tubing." },
    { name: "5mm Rigid Shaft Coupler (2pk)", link: "https://www.amazon.com/s?k=5mm+rigid+shaft+coupler+aluminum", price: "$6", qty: 1, compat: "Backup if roller doesn't fit motor shaft directly.", note: "Aluminum with set screws." },
    { name: "Compression Spring Assortment", link: "https://www.amazon.com/s?k=small+compression+spring+assortment+kit", price: "$7", qty: 1, compat: "~10mm OD × 25-30mm for hopper pusher.", note: "Start with light tension." },
  ]},
  { cat: "📡 Electronics & Wiring", items: [
    { name: "Adafruit IR Break Beam 5mm (ADA2168)", link: "https://www.amazon.com/Adafruit-IR-Break-Beam-Sensor/dp/B00XW2NVJU", price: "$4", qty: 2, compat: "3.3V/5V, open-collector output. Triggers camera capture when card is in position.", note: "Buy 2. One for card detection." },
    { name: "12V 5A DC Power Supply", link: "https://www.amazon.com/s?k=12V+5A+DC+power+supply+barrel+jack", price: "$12", qty: 1, compat: "Feeds TMC2209 VMOT (4.75-28V). 5A for 2× NEMA 17 at 2A each.", note: "Barrel jack output." },
    { name: "Barrel Jack Screw Terminal Adapter", link: "https://www.amazon.com/s?k=barrel+jack+screw+terminal+adapter+5.5x2.1", price: "$3", qty: 1, compat: "Converts 12V barrel jack to screw terminals for easy wiring to breadboard.", note: "5.5×2.1mm standard size." },
    { name: "LM2596 Buck Converter (3pk)", link: "https://www.amazon.com/s?k=LM2596+buck+converter+adjustable", price: "$8", qty: 1, compat: "Steps 12V → 5.5V for MG996R servo. 3A output handles servo stall current.", note: "Set to 5.5V with multimeter before connecting servo." },
    { name: "Dupont Jumper Wires (120pc)", link: "https://www.amazon.com/Elegoo-EL-CP-004-Multicolored-Breadboard-arduino/dp/B01EV70C78", price: "$7", qty: 1, compat: "2.54mm pitch matches all components.", note: "M-M, M-F, F-F variety." },
    { name: "Breadboard 830 (2pk)", link: "https://www.amazon.com/s?k=breadboard+830+tie+points+2+pack", price: "$7", qty: 1, compat: "Standard pitch for prototyping.", note: "Separate power from signals." },
    { name: "M3 Screw Kit (240pc)", link: "https://www.amazon.com/s?k=M3+screw+assortment+kit+hex+socket+nuts", price: "$9", qty: 1, compat: "NEMA 17 uses M3 at 31mm spacing. Separation pad mounts to hopper with M3.", note: "Various lengths + nuts + washers." },
    { name: "M2 Screw + Standoff Kit", link: "https://www.amazon.com/s?k=M2+screw+standoff+kit+assortment", price: "$7", qty: 1, compat: "ESP32-CAM mount has M2 standoff holes (Ø2.4mm) for securing the board. M3 kit does NOT include M2.", note: "Need 4× M2 screws + 4× standoffs (~5mm tall)." },
  ]},
  { cat: "🖨️ Consumables", items: [
    { name: "PLA Filament 1kg (1.75mm)", link: "https://www.amazon.com/s?k=PLA+filament+1kg+1.75mm", price: "$20", qty: 1, compat: "All parts designed for PLA.", note: "~700g total, one spool covers it." },
    { name: "PTFE Tape (plumber's tape)", link: "https://www.amazon.com/s?k=PTFE+plumber+tape", price: "$3", qty: 1, compat: "Lines card bridge channel for smooth card travel.", note: "Replace when worn." },
    { name: "Cork Sheet (1mm, self-adhesive)", link: "https://www.amazon.com/s?k=cork+sheet+1mm+self+adhesive", price: "$5", qty: 1, compat: "50×12mm piece for separation pad.", note: "Prevents double-feeding." },
  ]},
];

// --- 3D PARTS DATA (v2 — fully 3D printed, camera-up center column design) ---
const PARTS_3D = [
  { num: "01", name: "Center Column", ext: "Ø100×110mm (flange Ø100, tube Ø55)", inner: "Ø42mm hollow, camera sled inside", orient: "Upright", infill: "30%", time: "~3 hrs", weight: "~60g", notes: "Fixed post through turntable center. Camera looks UP through window at top. USB slot on side. Bridge mounting tabs at top. Base flange with 6× M3 holes. Acrylic window sits in top cap recess." },
  { num: "02a", name: "Turntable Half A", ext: "242×121×15mm", inner: "6 bin pockets (72×97mm, 10mm deep)", orient: "Flat", infill: "20%, 4 walls", time: "~4 hrs", weight: "~70g", notes: "Left half of Ø240mm turntable. 60 gear teeth on outer edge. 3 alignment pin holes + 2 M3 bolt holes on split line. Center hole Ø62mm for column clearance. Print flat, no supports needed." },
  { num: "02b", name: "Turntable Half B", ext: "242×121×15mm", inner: "Mirror of Half A", orient: "Flat", infill: "20%, 4 walls", time: "~4 hrs", weight: "~70g", notes: "Right half — mirror of Half A. Join with 4mm pins + M3 bolts through split line holes." },
  { num: "03", name: "Card Bin ×6", ext: "71×96×43mm", inner: "70×95×41mm", orient: "Upright", infill: "20%", time: "~1 hr ea", weight: "~25g ea", notes: "Sits in turntable pocket. Funnel top for easy card entry. Finger scoop. 2mm bottom lip keys into pocket. Holds ~40 sleeved cards." },
  { num: "04", name: "Card Bridge", ext: "76×200×20mm", inner: "70mm channel, 8mm floor, 12mm rails", orient: "Flat (channel up)", infill: "20%", time: "~3 hrs", weight: "~55g", notes: "Inclined track (~10°) from hopper to exit. Camera window 52×75mm with acrylic ledge. Servo pocket for gate on right rail. Gate flap slot. Center column mount holes. Hopper mount holes at high end." },
  { num: "05", name: "Card Hopper", ext: "76×101×120mm", inner: "70×95mm cavity", orient: "Upright", infill: "20%", time: "~3.5 hrs", weight: "~65g", notes: "Sits on elevated end of bridge. Roller slot 30×20mm in floor. Feed slot at front (70×8mm). Spring pocket Ø12mm. Sep pad M3 holes on front face. Viewing window on side." },
  { num: "05b", name: "Pusher Plate", ext: "67×92×3mm", inner: "Solid", orient: "Flat", infill: "100%", time: "~20 min", weight: "~5g", notes: "Rides on spring inside hopper. Centering dimple on bottom." },
  { num: "06", name: "Feed Roller Mount", ext: "108×60×5mm", inner: "NEMA 17: 31mm holes, 24mm boss", orient: "Flat", infill: "30%", time: "~1 hr", weight: "~25g", notes: "Mounts NEMA 17 under hopper. Roller pokes up through hopper floor slot. M5 tab slots on sides." },
  { num: "06b", name: "Separation Pad", ext: "60×22×6mm", inner: "Cork recess: 50×12×1.5mm", orient: "Flat", infill: "30%", time: "~15 min", weight: "~5g", notes: "Cork-faced. Bolts to hopper front face (M3, 50mm spacing). Prevents double-feeding." },
  { num: "07", name: "Gate Flap", ext: "68×20×2mm", inner: "Horn hole Ø5.8mm", orient: "Flat", infill: "100%", time: "~10 min", weight: "~2g", notes: "Press-fits onto MG996R 25T horn. Blocks/releases cards at camera window." },
  { num: "08", name: "Turntable Motor Mount", ext: "60×53×50mm", inner: "NEMA 17 bolt pattern", orient: "Upright", infill: "30%", time: "~1.5 hrs", weight: "~30g", notes: "L-bracket. Mounts NEMA 17 outside turntable. Pinion gear on shaft meshes with turntable teeth. M5 mounting holes." },
  { num: "09", name: "Pinion Gear", ext: "Ø25×15mm", inner: "D-shaft Ø5mm, M3 set screw", orient: "Flat", infill: "100%", time: "~30 min", weight: "~5g", notes: "12 teeth, meshes with 60-tooth turntable edge. 5:1 gear ratio. D-shaft flat + set screw for grip." },
  { num: "10", name: "Camera Sled", ext: "40×42×8mm", inner: "ESP32-CAM 27×40.5mm recess", orient: "Flat", infill: "30%", time: "~20 min", weight: "~5g", notes: "Slides into center column from bottom. 4× M2 standoff posts hold ESP32-CAM. Lens hole Ø16mm through center." },
  { num: "11", name: "LED Ring Holder", ext: "Ø59×8mm", inner: "Ø30mm center opening", orient: "Flat", infill: "20%", time: "~30 min", weight: "~8g", notes: "Sits on top of center column around camera window. LED channel recess. Wire routing slot." },
  { num: "12", name: "Exit Chute", ext: "94×25×30mm", inner: "70mm card channel", orient: "Upright", infill: "20%", time: "~30 min", weight: "~10g", notes: "Guides card from bridge exit down into turntable bin. Mounting tabs on sides." },
];

// --- ASSEMBLY STEPS ---
// Assembly data is now embedded in the Assembly component for richer detail

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
    ["Vision", "ESP32-CAM (OV2640) looks UP through acrylic window → browser OCR"],
    ["Controller", "ESP32-CAM (~$10) — replaces Raspberry Pi ($80+)"],
    ["Turntable", "Ø240mm (prints in 2 halves), gear-driven, camera in center"],
    ["Sort Bins", "6 (Fury, Calm, Mind, Body, Chaos, Order)"],
    ["Strategy", "Two-pass: domain color first, then energy cost"],
    ["Speed", "~2-3 sec/card (~200 cards in 15 min)"],
    ["Est. Cost", "$50–80 total"],
    ["Print Time", "~25-30 hrs (~800g PLA, under 1 spool)"],
    ["Structure", "Fully 3D printed — no aluminum extrusion frame"],
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
          ["📦 Hopper", "Cards stacked flat. Spring pushes stack down onto roller. Roller pulls bottom card out.", null],
          ["🔄 Feed Roller", "NEMA 17 + silicone roller under hopper. Sep pad prevents doubles. Card exits onto bridge.", S.orange],
          ["📐 Card Bridge", "Card slides down inclined bridge (~10°) toward center. Gravity does the work.", S.green],
          ["📸 Camera Window", "Card stops at gate over clear acrylic window. ESP32-CAM inside center column looks UP, captures full card face.", S.pink],
          ["🚪 Release Gate", "MG996R servo holds card during scan. Opens to release card toward exit chute.", S.accent],
          ["🎯 Turntable", "Ø240mm disc with 6 bins rotates around center column. Pinion gear positions correct bin at exit. Card drops in.", S.cyan],
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

      <H2 style={{ marginTop: 24 }}>How the Card Path Works</H2>
      <P>The hopper sits on the elevated end of a card bridge. Spring pressure pushes cards down onto the roller, which pulls the bottom card through the feed slot. The card slides along the inclined bridge toward the center column.</P>
      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, margin: "10px 0", fontSize: 11, lineHeight: 1.8, color: S.text }}>
        <span style={{color:S.green}}>Hopper</span> → <span style={{color:S.orange}}>Feed roller grabs bottom card</span> → <span style={{color:S.pink}}>Card slides down bridge (~10°)</span> → <span style={{color:S.accent}}>Gate stops card over camera window</span> → <span style={{color:"#fff"}}>Camera reads card from below</span> → <span style={{color:S.cyan}}>Gate opens → card slides to exit → drops into turntable bin</span>
      </div>
      <P>The camera is inside a fixed center column, looking UP through an acrylic window. The turntable rotates around the column. This means the camera never moves — only the bins rotate to catch the sorted card.</P>
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
function AssemblyDiagram({ children, label, viewBox = "0 0 600 300", maxW = 600 }) {
  return (
    <div style={{ background: "#0a0a1a", border: `1px solid ${S.border}`, borderRadius: 8, padding: 16, margin: "12px 0", textAlign: "center" }}>
      <svg viewBox={viewBox} style={{ width: "100%", maxWidth: maxW, height: "auto" }}>{children}</svg>
      {label && <div style={{ fontSize: 13, color: S.dim, marginTop: 8, fontStyle: "italic" }}>{label}</div>}
    </div>
  );
}

function AssemblyStep({ num, title, parts, tools, caution, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 16 }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer", padding: "6px 0" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: S.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", flexShrink: 0 }}>{num}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 14, fontWeight: 600, color: "#fff" }}>{title}</div>
          {parts && <div style={{ fontSize: 9, color: S.accent, marginTop: 2 }}>Parts: {parts}</div>}
        </div>
        <div style={{ color: S.dark, fontSize: 12 }}>{open ? "▼" : "▶"}</div>
      </div>
      {open && (
        <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 14, marginLeft: 44 }}>
          {tools && <div style={{ fontSize: 9, color: S.dim, marginBottom: 8, padding: "4px 8px", background: S.bg, borderRadius: 4, display: "inline-block" }}>🔧 Tools: {tools}</div>}
          {caution && <div style={{ fontSize: 10, color: S.orange, marginBottom: 10, padding: "6px 10px", background: S.orange + "11", border: `1px solid ${S.orange}33`, borderRadius: 6 }}>⚠️ {caution}</div>}
          <div style={{ fontSize: 11, color: S.text, lineHeight: 1.8 }}>{children}</div>
        </div>
      )}
    </div>
  );
}

function SubStep({ children }) {
  return <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><span style={{ color: S.accent, flexShrink: 0 }}>→</span><span>{children}</span></div>;
}

function FullAssemblyDiagram() {
  // Clean top-view schematic — fully 3D-printed design with center column camera
  const stages = [
    { label: "Card Hopper", sub: "76×101×120mm · Spring + Pusher + Feed Roller", color: "#6c63ff", part: "05", icon: "📥" },
    { label: "Card Bridge", sub: "76×200mm · ~10° incline · Camera window center", color: "#06b6d4", part: "04", icon: "🌉" },
    { label: "Center Column", sub: "ESP32-CAM inside looking UP · Servo gate", color: "#10b981", part: "01", icon: "📷" },
    { label: "Turntable + 6 Bins", sub: "Ø240mm disc · 6 pockets · Gear drive", color: "#2563eb", part: "02, 03", icon: "🎯" },
  ];

  return (
    <div style={{ background: "#0a0a1a", border: `1px solid ${S.accent}44`, borderRadius: 12, padding: 20, margin: "16px 0" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: S.accent, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 4, textAlign: "center" }}>Full Machine — Layout Overview</div>
      <div style={{ fontSize: 10, color: S.dim, textAlign: "center", marginBottom: 16 }}>~260mm wide × 260mm deep × ~250mm tall · Fully 3D printed, no aluminum frame</div>

      {/* Horizontal flow diagram */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        {stages.map((s, i) => (
          <div key={i} style={{ width: "100%", maxWidth: 420 }}>
            {/* Stage box */}
            <div style={{
              background: s.color + "0a",
              border: `2px solid ${s.color}55`,
              borderRadius: 10,
              padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{ fontSize: 28, flexShrink: 0, width: 40, textAlign: "center" }}>{s.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>{s.label}</span>
                  <span style={{ fontSize: 9, color: s.color, opacity: 0.6, fontFamily: "monospace" }}>Part {s.part}</span>
                </div>
                <div style={{ fontSize: 10, color: S.dim, marginTop: 2 }}>{s.sub}</div>
              </div>
              {/* Width indicator */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk',sans-serif" }}>76mm</div>
                <div style={{ fontSize: 8, color: S.dim }}>card path</div>
              </div>
            </div>
            {/* Arrow between stages */}
            {i < stages.length - 1 && (
              <div style={{ textAlign: "center", padding: "2px 0", color: S.dim, fontSize: 16 }}>
                {["→ feed roller pulls card out", "→ card slides down bridge", "→ IR detects & camera scans", "→ turntable rotates to bin"][i]}
                <div style={{ fontSize: 18, marginTop: -2 }}>→</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* How it works summary */}
      <div style={{ marginTop: 16, padding: 14, background: "#0e0e1a", borderRadius: 8, maxWidth: 420, margin: "16px auto 0" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 8, textAlign: "center" }}>How One Card Gets Sorted</div>
        <div style={{ fontSize: 10, color: S.dim, lineHeight: 2.0 }}>
          <span style={{color:"#6c63ff"}}>1.</span> Load sleeved cards into hopper (sits on elevated end of bridge)<br/>
          <span style={{color:"#6c63ff"}}>2.</span> Feed roller grabs bottom card, pulls it out through feed slot<br/>
          <span style={{color:"#06b6d4"}}>3.</span> Card slides down inclined bridge toward center (gravity, ~10°)<br/>
          <span style={{color:"#06b6d4"}}>4.</span> Gate stops card over clear acrylic window at center column<br/>
          <span style={{color:"#10b981"}}>5.</span> ESP32-CAM (inside column, looking UP) captures full card face through window<br/>
          <span style={{color:"#10b981"}}>6.</span> Software identifies domain from card image (cost, power, color, type)<br/>
          <span style={{color:"#2563eb"}}>7.</span> Turntable rotates correct bin to exit position (pinion gear drive)<br/>
          <span style={{color:"#2563eb"}}>8.</span> Gate opens → card slides to bridge exit → drops into bin via exit chute
        </div>
      </div>
    </div>
  );
}

function Assembly() {
  return (
    <div>
      <H2>Assembly Instructions</H2>
      <P>Full build guide. Fully 3D printed structure — no aluminum extrusion frame needed. ~260mm wide × 260mm deep × ~250mm tall. Estimated assembly: 2-3 hours.</P>

      <FullAssemblyDiagram />

      <div style={{ background: S.card, border: `1px solid ${S.border}`, borderRadius: 8, padding: 12, margin: "12px 0", fontSize: 10, color: S.dim, lineHeight: 1.8 }}>
        <span style={{ color: "#fff", fontWeight: 600 }}>Before you start:</span> Print all 3D parts (see 3D Parts tab). Have M3 + M2 screws, 4mm dowel pins, and tools ready. Test-fit parts before tightening anything.
      </div>

      <AssemblyStep num={1} title="Print & Join Turntable Halves" parts="02a + 02b (Turntable Halves), 4mm dowel pins ×3, M3 bolts ×2" tools="M3 hex wrench">
        <SubStep>Lay both turntable halves flat (split line facing up)</SubStep>
        <SubStep>Insert 4mm dowel pins into the 3 alignment holes on one half</SubStep>
        <SubStep>Press the other half onto the pins, aligning the edges carefully</SubStep>
        <SubStep>Secure with M3 bolts through the 2 bolt holes on the split line — snug but don't over-tighten the PLA</SubStep>

        <AssemblyDiagram label="Turntable assembly — top view showing 6 pockets and gear teeth" viewBox="0 0 600 300">
          {/* Outer circle (turntable disc) */}
          <circle cx="300" cy="150" r="120" fill="#1a1a3a" stroke="#4a9eff" strokeWidth="2" />
          {/* Gear teeth on outer edge */}
          <g strokeWidth="1.5" fill="none">
            {[0, 60, 120, 180, 240, 300].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 300 + 120 * Math.cos(rad);
              const y1 = 150 + 120 * Math.sin(rad);
              const x2 = 300 + 135 * Math.cos(rad);
              const y2 = 150 + 135 * Math.sin(rad);
              return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ea580c" />;
            })}
          </g>
          {/* 6 pockets at 60° intervals */}
          <g>
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const cx = 300 + 75 * Math.cos(rad);
              const cy = 150 + 75 * Math.sin(rad);
              return (
                <g key={i}>
                  <rect x={cx - 20} y={cy - 20} width="40" height="40" fill="#9333ea33" stroke="#9333ea" strokeWidth="1.5" rx="3" />
                  <text x={cx} y={cy + 4} fill="#9333ea" fontSize="12" textAnchor="middle" fontWeight="600">{i + 1}</text>
                </g>
              );
            })}
          </g>
          {/* Center hole */}
          <circle cx="300" cy="150" r="35" fill="none" stroke="#10b981" strokeWidth="2" />
          <text x="300" y="156" fill="#10b981" fontSize="12" textAnchor="middle" fontWeight="600">Ø62mm</text>
          {/* Split line */}
          <line x1="180" y1="150" x2="420" y2="150" stroke="#666" strokeWidth="1" strokeDasharray="4,4" />
          <text x="300" y="180" fill="#aaa" fontSize="12" textAnchor="middle">split line (bolt through both halves)</text>
          <text x="300" y="265" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Ø240mm turntable with 6 bins at 60° spacing</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> The two halves are aligned and snug. Center hole should be smooth and centered.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={2} title="Set Up Center Column" parts="01 (Center Column), 10 (Camera Sled), ESP32-CAM, LED ring (Part 11)" tools="M2 screws">
        <SubStep>Slide <span style={{color:"#fff"}}>Part 10 (Camera Sled)</span> into the center column from the bottom</SubStep>
        <SubStep>Secure ESP32-CAM to sled with M2 screws — lens faces <span style={{color:S.orange}}>UP</span> through the window hole</SubStep>
        <SubStep>Place <span style={{color:"#fff"}}>Part 11 (LED ring holder)</span> on top of column around the camera window opening</SubStep>
        <SubStep>USB cable exits through the side slot for power and communication</SubStep>

        <AssemblyDiagram label="Center column cross-section — camera inside looking UP" viewBox="0 0 600 340">
          {/* Column outline */}
          <rect x="180" y="40" width="240" height="280" fill="#1a1a3a" stroke="#10b981" strokeWidth="2" rx="6" />
          <text x="300" y="25" fill="#10b981" fontSize="14" textAnchor="middle" fontWeight="600">Center Column (Part 01)</text>

          {/* ESP32-CAM board inside */}
          <rect x="220" y="120" width="160" height="100" fill="#1a1a3a" stroke="#16a34a" strokeWidth="1.5" rx="4" />
          <text x="300" y="155" fill="#16a34a" fontSize="12" textAnchor="middle" fontWeight="600">ESP32-CAM</text>

          {/* Camera lens pointing UP */}
          <circle cx="300" cy="110" r="12" fill="#16a34a22" stroke="#16a34a" strokeWidth="2" />
          <circle cx="300" cy="110" r="4" fill="#16a34a" />
          <text x="300" y="135" fill="#16a34a" fontSize="10" textAnchor="middle">OV2640</text>

          {/* Acrylic window at top */}
          <rect x="230" y="35" width="140" height="20" fill="#9333ea55" stroke="#9333ea" strokeWidth="2" rx="2" />
          <text x="300" y="50" fill="#9333ea" fontSize="12" textAnchor="middle" fontWeight="600">Acrylic window</text>

          {/* Light path UP */}
          <path d="M 300 115 L 300 55" stroke="#fff" strokeWidth="1.5" strokeDasharray="6,4" fill="none" />
          <text x="330" y="90" fill="#aaa" fontSize="11">looks UP ↑</text>

          {/* LED ring on top */}
          <circle cx="300" cy="40" r="80" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="380" y="25" fill="#eab308" fontSize="12" fontWeight="600">LED ring</text>

          {/* USB cable exit */}
          <line x1="420" y1="170" x2="480" y2="170" stroke="#ea580c" strokeWidth="2.5" />
          <text x="490" y="175" fill="#ea580c" fontSize="12" fontWeight="600">USB →</text>

          {/* Camera sled rail */}
          <rect x="175" y="110" width="10" height="140" fill="#4a9eff" opacity="0.3" rx="2" />
          <text x="160" y="190" fill="#4a9eff" fontSize="11">rail</text>

          <text x="300" y="315" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Camera captures card image through window</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Column is complete and sturdy. Camera lens is clean and faces up. USB cable has slack for routing.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={3} title="Install Turntable on Column" parts="Assembled turntable (from Step 1), center column (Part 01), optional 608ZZ bearing" tools="None — gravity assembly">
        <SubStep>Place the <span style={{color:"#fff"}}>center column's base flange</span> flat on your work surface</SubStep>
        <SubStep>Optionally place a 608ZZ bearing or PTFE washer on the flange (for smoother rotation)</SubStep>
        <SubStep>Lower the turntable disc over the column — center hole (Ø62mm) fits over the column (Ø55mm) with clearance</SubStep>
        <SubStep>The turntable should spin freely around the column with minimal friction</SubStep>

        <AssemblyDiagram label="Turntable mounting — side cross-section" viewBox="0 0 600 300">
          {/* Work surface */}
          <line x1="80" y1="240" x2="520" y2="240" stroke="#666" strokeWidth="2" />
          <text x="50" y="255" fill="#aaa" fontSize="11">work surface</text>

          {/* Center column */}
          <rect x="250" y="100" width="100" height="140" fill="#1a1a3a" stroke="#10b981" strokeWidth="2" rx="4" />
          <text x="300" y="175" fill="#10b981" fontSize="12" textAnchor="middle">Center</text>
          <text x="300" y="190" fill="#10b981" fontSize="12" textAnchor="middle">Column</text>

          {/* Base flange */}
          <rect x="230" y="235" width="140" height="12" fill="#10b981" opacity="0.4" stroke="#10b981" strokeWidth="1.5" rx="2" />
          <text x="280" y="260" fill="#10b981" fontSize="11">flange</text>

          {/* Optional bearing */}
          <circle cx="300" cy="241" r="18" fill="none" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="340" y="245" fill="#eab308" fontSize="11">608ZZ bearing (optional)</text>

          {/* Turntable disc around column */}
          <circle cx="300" cy="130" r="110" fill="#1a1a3a" stroke="#4a9eff" strokeWidth="2" />
          <text x="300" y="135" fill="#4a9eff" fontSize="13" textAnchor="middle" fontWeight="600">Turntable</text>

          {/* 6 pockets */}
          {[0, 60, 120, 180, 240, 300].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const cx = 300 + 70 * Math.cos(rad);
            const cy = 130 + 70 * Math.sin(rad);
            return (
              <rect key={angle} x={cx - 12} y={cy - 12} width="24" height="24" fill="#9333ea33" stroke="#9333ea" strokeWidth="1" rx="2" />
            );
          })}

          {/* Clearance gap showing */}
          <line x1="350" y1="100" x2="380" y2="100" stroke="#666" strokeWidth="1" strokeDasharray="3,3" />
          <line x1="365" y1="95" x2="365" y2="105" stroke="#666" strokeWidth="1" />
          <text x="400" y="105" fill="#aaa" fontSize="11">clearance</text>

          {/* Rotation arrow */}
          <path d="M 200 130 A 50 50 0 0 1 400 130" stroke="#2563eb" strokeWidth="2" fill="none" />
          <text x="300" y="85" fill="#2563eb" fontSize="12" fontWeight="600" textAnchor="middle">spins freely ↻</text>

          <text x="300" y="290" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Turntable rotates around center column with low friction</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Spin the turntable by hand — it should rotate smoothly. No binding or wobble.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={4} title="Snap In 6 Card Bins" parts="03 (Card Bin) ×6" tools="None — snap fit">
        <SubStep>Each <span style={{color:"#fff"}}>Part 03 (Card Bin, 72×97mm)</span> drops into a pocket on the turntable</SubStep>
        <SubStep>The 2mm bottom lip keys into the pocket for alignment</SubStep>
        <SubStep>Press each bin straight down until it seats flush</SubStep>
        <SubStep>Label each bin by domain (or print with colored filament):</SubStep>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "8px 0 8px 20px" }}>
          {DOMAINS.map((d,i) => (
            <div key={i} style={{ background: d.color+"18", border: `1px solid ${d.color}44`, borderRadius: 4, padding: "3px 8px", fontSize: 9, color: d.color, fontWeight: 600 }}>{d.icon} {d.name}</div>
          ))}
        </div>
        <SubStep>Each bin holds ~100 sleeved cards. Finger scoop at front for easy removal</SubStep>
        <SubStep><span style={{color:S.green}}>✓ Test:</span> All 6 bins seated tight. Turntable still spins freely.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={5} title="Mount the Card Bridge" parts="04 (Card Bridge), 56×79mm clear acrylic sheet, M3 screws" tools="M3 hex wrench, acrylic cutter">
        <SubStep>Cut a <span style={{color:"#fff"}}>56×79mm piece of clear acrylic</span> and place it in the window ledge on the bridge</SubStep>
        <SubStep>Bolt the bridge to the center column's top mounting tabs using M3 screws</SubStep>
        <SubStep>The bridge should extend from one side of the turntable to the other, passing over the center column</SubStep>
        <SubStep>The hopper end (one side) should be slightly elevated (~10° incline) — use shims or print angled spacers if needed</SubStep>

        <AssemblyDiagram label="Card bridge — side view showing incline and window" viewBox="0 0 600 300">
          {/* Turntable */}
          <circle cx="300" cy="200" r="90" fill="none" stroke="#2563eb" strokeWidth="2" />
          <text x="300" y="205" fill="#2563eb" fontSize="12" textAnchor="middle">Turntable</text>

          {/* Center column */}
          <rect x="270" y="140" width="60" height="80" fill="#1a1a3a" stroke="#10b981" strokeWidth="2" rx="3" />
          <text x="300" y="185" fill="#10b981" fontSize="11" textAnchor="middle">column</text>

          {/* Bridge deck - angled */}
          <line x1="150" y1="120" x2="450" y2="160" stroke="#4a9eff" strokeWidth="6" />
          <line x1="150" y1="130" x2="450" y2="170" stroke="#4a9eff" strokeWidth="3" opacity="0.4" />
          <text x="300" y="130" fill="#4a9eff" fontSize="13" fontWeight="600">Card Bridge (Part 04)</text>

          {/* Acrylic window */}
          <rect x="260" y="145" width="80" height="10" fill="#9333ea55" stroke="#9333ea" strokeWidth="2" rx="2" />
          <text x="300" y="152" fill="#9333ea" fontSize="11" textAnchor="middle" fontWeight="600">acrylic window</text>

          {/* Hopper end (elevated) */}
          <rect x="140" y="100" width="40" height="30" fill="#1a1a3a" stroke="#6c63ff" strokeWidth="2" rx="3" />
          <text x="160" y="120" fill="#6c63ff" fontSize="11" textAnchor="middle" fontWeight="600">hopper</text>

          {/* Exit end (low) */}
          <rect x="450" y="160" width="40" height="20" fill="#1a1a3a" stroke="#2563eb" strokeWidth="1.5" rx="3" />
          <text x="470" y="172" fill="#2563eb" fontSize="10" textAnchor="middle">exit</text>

          {/* Angle arrow */}
          <path d="M 150 125 L 170 115" stroke="#ea580c" strokeWidth="1.5" fill="none" />
          <text x="130" y="118" fill="#ea580c" fontSize="12" fontWeight="600">~10°</text>

          {/* Card sliding down */}
          <path d="M 200 125 L 280 148" stroke="#fff" strokeWidth="1.5" strokeDasharray="6,4" fill="none" />
          <text x="220" y="110" fill="#aaa" fontSize="11">card slides →</text>

          <text x="300" y="280" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Bridge spans turntable, window centered over column</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Bridge is level and centered. Acrylic window is flush. No wobble at the center column attachment.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={6} title="Install Gate Mechanism" parts="07 (Gate Flap), MG996R servo" tools="M3 screws">
        <SubStep>Slide the MG996R servo into the servo pocket on the right rail of the bridge (at camera window position)</SubStep>
        <SubStep>Attach the 25T cross horn to the servo shaft</SubStep>
        <SubStep>Press-fit the gate flap (Part 07) onto the horn</SubStep>
        <SubStep>At 0° the flap blocks the channel; at 90° it clears</SubStep>

        <AssemblyDiagram label="Gate mechanism — flap closes to hold card over window" viewBox="0 0 600 300">
          {/* Bridge rail */}
          <rect x="100" y="80" width="400" height="40" fill="#4a9eff22" stroke="#4a9eff" strokeWidth="2" rx="4" />
          <text x="300" y="110" fill="#4a9eff" fontSize="12" textAnchor="middle" fontWeight="600">Bridge Channel</text>

          {/* Servo */}
          <rect x="260" y="130" width="80" height="70" fill="#16a34a22" stroke="#16a34a" strokeWidth="2" rx="4" />
          <text x="300" y="170" fill="#16a34a" fontSize="12" textAnchor="middle" fontWeight="600">MG996R</text>

          {/* Servo shaft */}
          <circle cx="300" cy="145" r="6" fill="#16a34a" />

          {/* Gate flap — closed position */}
          <rect x="150" y="98" width="200" height="8" fill="#ea580c" stroke="#ea580c" strokeWidth="1.5" rx="2" />
          <text x="150" y="75" fill="#ea580c" fontSize="13" fontWeight="600">Gate Flap (0° = closed)</text>

          {/* Card above flap */}
          <rect x="180" y="50" width="100" height="25" fill="#fff" opacity="0.08" stroke="#fff" strokeWidth="1" rx="2" />
          <text x="230" y="67" fill="#fff" fontSize="12" textAnchor="middle">card held</text>

          {/* Open position ghost */}
          <path d="M 300 145 L 300 200" stroke="#16a34a" strokeWidth="2" strokeDasharray="5,5" fill="none" />
          <line x1="150" y1="205" x2="300" y2="205" stroke="#16a34a" strokeWidth="2" strokeDasharray="5,5" />
          <text x="320" y="210" fill="#16a34a" fontSize="12" fontWeight="600">90° = open</text>

          {/* Acrylic window */}
          <rect x="240" y="75" width="120" height="12" fill="#9333ea55" stroke="#9333ea" strokeWidth="1.5" rx="1" />
          <text x="300" y="83" fill="#9333ea" fontSize="10" textAnchor="middle" fontWeight="600">window</text>

          <text x="300" y="280" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Servo rotates 0° → 90° to release card</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Manually rotate the horn — at 0° the flap blocks the channel, at 90° it clears completely.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={7} title="Install Hopper + Feed Roller" parts="05 (Hopper), 05b (Pusher), 06 (Feed Roller Mount), 06b (Sep Pad), NEMA 17 #1, spring, silicone roller" tools="M3 screws, hex wrench">
        <div style={{ fontWeight: 600, color: "#fff", marginBottom: 6 }}>Feed Roller Assembly:</div>
        <SubStep>Attach NEMA 17 stepper #1 to <span style={{color:"#fff"}}>Part 06 (Feed Roller Mount, 90×60mm)</span> using 4× M3 screws through the 31mm hole pattern</SubStep>
        <SubStep>Push the silicone roller wheel onto the motor shaft (5mm bore fits the D-shaft)</SubStep>
        <SubStep>Mount the roller assembly underneath the hopper — the roller pokes <span style={{color:S.orange}}>UP through the slot in the hopper floor</span> so it contacts the bottom card directly</SubStep>

        <div style={{ fontWeight: 600, color: "#fff", margin: "12px 0 6px" }}>Separation Pad:</div>
        <SubStep>Glue a 50×12mm cork strip into the recess on <span style={{color:"#fff"}}>Part 06b (Separation Pad)</span></SubStep>
        <SubStep>Bolt the sep pad to the <span style={{color:S.orange}}>hopper's front face using the M3 holes</span> flanking the feed slot — cork faces inward, directly opposite the roller</SubStep>
        <SubStep>This creates friction against the second card so only the bottom card feeds through</SubStep>

        <div style={{ fontWeight: 600, color: "#fff", margin: "12px 0 6px" }}>Hopper Assembly:</div>
        <SubStep>Drop the compression spring into the spring pocket in the floor of <span style={{color:"#fff"}}>Part 05 (Card Hopper, 76×101×120mm)</span></SubStep>
        <SubStep>Place <span style={{color:"#fff"}}>Part 05b (Pusher Plate)</span> on top of the spring — the dimple centers it on the spring</SubStep>
        <SubStep>Mount the hopper above the feed roller at the elevated end of the bridge — the roller protrudes through the floor slot and the feed slot at the front wall lines up with the bridge entrance</SubStep>
        <SubStep>The spring pushes cards down onto the roller. When the motor spins, the roller grabs the bottom card and pulls it out through the feed slot</SubStep>

        <AssemblyDiagram label="Hopper + feed roller cross-section (side view, looking along roller axis)" viewBox="0 0 600 400">
          {/* Hopper body */}
          <rect x="150" y="15" width="140" height="210" fill="#1a1a3a" stroke="#6c63ff" strokeWidth="2" rx="5" />
          <text x="220" y="10" fill="#6c63ff" fontSize="14" textAnchor="middle" fontWeight="600">Hopper (Part 05)</text>
          {/* Card stack */}
          <rect x="170" y="55" width="100" height="60" fill="#fff" opacity="0.08" rx="2" />
          <text x="220" y="90" fill="#fff" fontSize="13" textAnchor="middle">card stack</text>
          {/* Pusher plate */}
          <rect x="168" y="45" width="104" height="6" fill="#f59e0b" rx="2" />
          <text x="298" y="52" fill="#f59e0b" fontSize="12" fontWeight="600">← Pusher (05b)</text>
          {/* Spring — toward the back of hopper */}
          <path d="M 250 125 Q 240 135 250 145 Q 260 155 250 165 Q 240 175 250 185" stroke="#10b981" strokeWidth="2" fill="none" />
          <text x="268" y="160" fill="#10b981" fontSize="12" fontWeight="600">spring</text>
          {/* Hopper floor — roller slot is NEAR the feed slot (front wall, left side in this view) */}
          <rect x="150" y="200" width="20" height="8" fill="#6c63ff" opacity="0.6" rx="1" />
          <rect x="200" y="200" width="90" height="8" fill="#6c63ff" opacity="0.6" rx="1" />
          <rect x="170" y="200" width="30" height="8" fill="#0a0a1a" />
          {/* Roller slot label */}
          <line x1="185" y1="215" x2="185" y2="235" stroke="#9333ea" strokeWidth="1" strokeDasharray="3,3" />
          <text x="185" y="250" fill="#9333ea" fontSize="12" textAnchor="middle" fontWeight="600">roller slot</text>
          <text x="185" y="265" fill="#9333ea" fontSize="10" textAnchor="middle">(near feed slot)</text>
          {/* Bottom card resting on roller */}
          <rect x="170" y="191" width="100" height="4" fill="#fff" opacity="0.3" rx="1" />
          <text x="298" y="196" fill="#fff" fontSize="11" opacity="0.7">← bottom card on roller</text>
          {/* Roller poking through near feed slot */}
          <circle cx="185" cy="218" r="16" fill="#9333ea" opacity="0.15" stroke="#9333ea" strokeWidth="2" />
          <circle cx="185" cy="218" r="4" fill="#9333ea" />
          <text x="298" y="222" fill="#9333ea" fontSize="12" fontWeight="600">← Roller (pokes UP near feed slot)</text>
          {/* Feed slot at front wall (left side in this side-view) */}
          <rect x="146" y="198" width="8" height="16" fill="#0a0a1a" />
          <text x="105" y="206" fill="#ec4899" fontSize="12" textAnchor="end" fontWeight="600">feed slot →</text>
          {/* Sep pad on front face */}
          <rect x="132" y="202" width="14" height="14" fill="#f59e0b" opacity="0.4" stroke="#f59e0b" strokeWidth="1.5" rx="2" />
          <line x1="105" y1="230" x2="139" y2="216" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3,3" />
          <text x="100" y="238" fill="#f59e0b" fontSize="12" textAnchor="end" fontWeight="600">sep pad (cork)</text>
          {/* Motor mounted HORIZONTALLY to the side — shaft along X, pointing into page */}
          <rect x="90" y="225" width="50" height="45" fill="#1a1a3a" stroke="#666" strokeWidth="1.5" rx="3" />
          <text x="115" y="252" fill="#888" fontSize="11" textAnchor="middle">NEMA 17</text>
          <text x="115" y="265" fill="#888" fontSize="9" textAnchor="middle">(horizontal)</text>
          {/* Shaft line from motor to roller */}
          <line x1="140" y1="240" x2="185" y2="218" stroke="#ea580c" strokeWidth="2" strokeDasharray="4,3" />
          <text x="175" y="285" fill="#ea580c" fontSize="11" textAnchor="middle">shaft axis → across card width</text>
          {/* Card exit path */}
          <path d="M 138 210 L 110 230 L 80 270" stroke="#fff" strokeWidth="1.5" strokeDasharray="6,4" fill="none" />
          <text x="70" y="288" fill="#aaa" fontSize="12">↓ onto bridge</text>
          {/* How it works box */}
          <rect x="370" y="50" width="210" height="170" fill="#0e0e1a" stroke="#333" strokeWidth="1" rx="6" />
          <text x="475" y="75" fill="#fff" fontSize="14" fontWeight="600" textAnchor="middle">How it feeds:</text>
          <text x="382" y="100" fill="#aaa" fontSize="12">1. Spring pushes cards DOWN</text>
          <text x="382" y="122" fill="#aaa" fontSize="12">2. Bottom card rests ON roller</text>
          <text x="382" y="144" fill="#aaa" fontSize="12">3. Roller spins → pushes card</text>
          <text x="382" y="158" fill="#aaa" fontSize="12">{"   "}toward feed slot</text>
          <text x="382" y="180" fill="#aaa" fontSize="12">4. Sep pad blocks 2nd card</text>
          <text x="382" y="202" fill="#aaa" fontSize="12">5. Card exits onto bridge</text>
        </AssemblyDiagram>

        <SubStep>Load ~20 test cards (sleeved) into the hopper to verify the spring pressure pushes them down onto the roller</SubStep>
        <SubStep><span style={{color:S.green}}>✓ Test:</span> Manually rotate the motor shaft — one card at a time should feed through the slot onto the bridge.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={8} title="Attach Exit Chute" parts="12 (Exit Chute)" tools="M3 screws">
        <SubStep>Bolt <span style={{color:"#fff"}}>Part 12 (Exit Chute)</span> to the low end of the bridge</SubStep>
        <SubStep>The chute guides cards from the bridge exit downward into the turntable bin below</SubStep>

        <AssemblyDiagram label="Exit chute — guides card from bridge to bin" viewBox="0 0 600 300">
          {/* Bridge */}
          <rect x="80" y="80" width="440" height="20" fill="#4a9eff22" stroke="#4a9eff" strokeWidth="2" rx="2" />
          <text x="300" y="98" fill="#4a9eff" fontSize="12" fontWeight="600">Bridge (low end)</text>

          {/* Chute angled down */}
          <path d="M 450 95 L 480 180" stroke="#10b981" strokeWidth="8" fill="none" strokeLinecap="round" />
          <text x="500" y="140" fill="#10b981" fontSize="13" fontWeight="600">Chute (Part 12)</text>

          {/* Card falling down */}
          <rect x="465" y="120" width="70" height="25" fill="#fff" opacity="0.08" stroke="#fff" strokeWidth="1" rx="2" />
          <text x="500" y="137" fill="#fff" fontSize="11" textAnchor="middle">card</text>

          {/* Turntable bin */}
          <rect x="450" y="180" width="100" height="80" fill="#2563eb22" stroke="#2563eb" strokeWidth="2" rx="3" />
          <text x="500" y="225" fill="#2563eb" fontSize="12" fontWeight="600">Bin</text>

          <text x="300" y="280" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Chute channels card into active bin</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Chute is secure and directs cards cleanly into the turntable bin below.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={9} title="Mount Turntable Motor" parts="08 (Motor Mount), 09 (Pinion Gear), NEMA 17 #2" tools="M3 screws, hex wrench">
        <SubStep>Bolt NEMA 17 #2 to the L-bracket motor mount with 4× M3 screws</SubStep>
        <SubStep>Press the pinion gear onto the motor shaft (D-flat alignment + M3 set screw)</SubStep>
        <SubStep>Position the motor mount so the pinion meshes with the turntable's outer gear teeth</SubStep>
        <SubStep>Secure the mount to your work surface</SubStep>

        <AssemblyDiagram label="Turntable motor — pinion meshes with turntable gear" viewBox="0 0 600 300">
          {/* Turntable with teeth */}
          <circle cx="250" cy="150" r="100" fill="none" stroke="#2563eb" strokeWidth="2" />
          <g strokeWidth="1.5" fill="none">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 250 + 100 * Math.cos(rad);
              const y1 = 150 + 100 * Math.sin(rad);
              const x2 = 250 + 115 * Math.cos(rad);
              const y2 = 150 + 115 * Math.sin(rad);
              return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ea580c" />;
            })}
          </g>
          <text x="250" y="155" fill="#2563eb" fontSize="12" textAnchor="middle" fontWeight="600">Turntable</text>

          {/* Motor */}
          <rect x="380" y="100" width="70" height="70" fill="#1a1a3a" stroke="#666" strokeWidth="1.5" rx="3" />
          <text x="415" y="140" fill="#888" fontSize="12" textAnchor="middle">NEMA 17</text>

          {/* Pinion gear */}
          <circle cx="380" cy="130" r="20" fill="none" stroke="#ea580c" strokeWidth="2" />
          <circle cx="380" cy="130" r="4" fill="#ea580c" />
          <text x="360" y="150" fill="#ea580c" fontSize="12" fontWeight="600">Pinion</text>

          {/* Mesh zone */}
          <circle cx="340" cy="130" r="25" fill="#fff" opacity="0.02" stroke="#eab308" strokeWidth="1.5" strokeDasharray="4,4" />
          <text x="320" y="175" fill="#eab308" fontSize="11" fontWeight="600">mesh zone</text>

          <text x="300" y="270" fill="#aaa" fontSize="13" fontWeight="600" textAnchor="middle">Pinion (driven gear) meshes with turntable teeth</text>
        </AssemblyDiagram>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Manually rotate the motor — turntable should rotate smoothly. No grinding or slipping.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={10} title="Install IR Break-Beam Sensor" parts="IR sensor pair (emitter + receiver)" tools="None — press fit">
        <SubStep>The bridge has two Ø6mm holes drilled through the rails at the camera window position</SubStep>
        <SubStep>Press the IR <span style={{color:"#fff"}}>emitter</span> into one side and the <span style={{color:"#fff"}}>receiver</span> into the other — they should face each other across the card channel</SubStep>
        <SubStep>When a card slides between them, it breaks the beam and triggers the ESP32 to capture a camera frame</SubStep>
        <SubStep>Route the 3 wires (VCC, GND, OUT) from the receiver along the bridge rail toward the ESP32</SubStep>
        <SubStep><span style={{color:S.green}}>✓ Test:</span> With the sensor wired to 3.3V, slide a card through — the output should go LOW when the beam is broken</SubStep>
      </AssemblyStep>

      <AssemblyStep num={11} title="Wire Everything" parts="TMC2209 drivers ×2, LM2596 buck converter, breadboard, jumper wires, 12V PSU" tools="Multimeter (important!), wire strippers">
        <div style={{ fontWeight: 600, color: "#fff", marginBottom: 6 }}>Power Chain:</div>
        <SubStep><span style={{color:"#fff"}}>12V PSU</span> → TMC2209 VMOT pins (both drivers)</SubStep>
        <SubStep><span style={{color:"#fff"}}>12V PSU</span> → LM2596 Buck IN → dial to <span style={{color:S.orange}}>5.5V</span> → MG996R servo (red wire)</SubStep>
        <SubStep><span style={{color:"#fff"}}>USB from computer</span> → ESP32-CAM-MB → powers the ESP32 (5V via USB)</SubStep>
        <SubStep><span style={{color:"#fff"}}>ESP32 3.3V pin</span> → both TMC2209 VIO pins (logic voltage)</SubStep>
        <SubStep><span style={{color:"#fff"}}>ESP32 5V pin</span> → IR sensor VCC (red wire)</SubStep>
        <SubStep><span style={{color:S.orange}}>ALL GND tied together:</span> ESP32 GND + 12V GND + Buck GND + Servo GND + IR GND + TMC2209 GND</SubStep>

        <div style={{ fontWeight: 600, color: "#fff", margin: "12px 0 6px" }}>Signal Wires (ESP32 → Components):</div>
        <SubStep>GPIO 12 → TMC2209 #1 STEP (feed motor)</SubStep>
        <SubStep>GPIO 13 → TMC2209 #1 DIR</SubStep>
        <SubStep>GPIO 14 → TMC2209 #2 STEP (turntable motor)</SubStep>
        <SubStep>GPIO 2 → TMC2209 #2 DIR</SubStep>
        <SubStep>GPIO 15 → MG996R signal wire (orange)</SubStep>
        <SubStep>GPIO 3 → IR sensor OUT (white wire)</SubStep>

        <SubStep><span style={{color:S.green}}>✓ Test:</span> Power on 12V supply. No smoke. Measure 5.5V at buck converter output. ESP32 boots and connects to WiFi.</SubStep>
      </AssemblyStep>

      <AssemblyStep num={12} title="Flash Firmware & First Sort" parts="Computer with Arduino IDE, Rift Tracker account" tools="USB cable">
        <SubStep>Download and install <span style={{color:"#fff"}}>Arduino IDE</span> from arduino.cc</SubStep>
        <SubStep>Go to <span style={{color:"#fff"}}>File → Preferences → Additional Board Manager URLs</span> and add the Espressif JSON URL</SubStep>
        <SubStep>Go to <span style={{color:"#fff"}}>Tools → Board → Board Manager</span>, search "esp32", install <span style={{color:"#fff"}}>esp32 by Espressif</span></SubStep>
        <SubStep>Select board: <span style={{color:"#fff"}}>Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM</span></SubStep>
        <SubStep>Snap the ESP32-CAM onto the programmer board, plug in USB, upload the sorter firmware</SubStep>
        <SubStep>Open <span style={{color:"#fff"}}>Tools → Serial Monitor</span> at 115200 baud — note the ESP32's local IP address</SubStep>
        <SubStep>Load 10-20 test cards into the hopper, hit Start in the sort interface</SubStep>
        <SubStep>Watch the live camera feed — each card is identified, the turntable rotates, and the card drops into the correct bin</SubStep>
        <SubStep>Check your Collection tab — every scanned card should appear automatically</SubStep>

        <div style={{ background: S.green + "11", border: `1px solid ${S.green}33`, borderRadius: 8, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: S.green, marginBottom: 4 }}>✓ You're done!</div>
          <div style={{ fontSize: 10, color: S.dim, lineHeight: 1.7 }}>
            If cards are double-feeding: tighten the separation pad or add more cork.<br/>
            If cards are jamming: add PTFE tape to bridge rails and make sure the window is clean.<br/>
            If domain detection is wrong: adjust the LED ring brightness or camera distance.
          </div>
        </div>
      </AssemblyStep>
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
