import { ChevronLeft, ExternalLink } from "lucide-react";
import { version } from "../../package.json";

const STUDIES = [
  {
    n: 1,
    title: "Validation du journal FAST (Food And Symptom Times)",
    authors: "Guo et al., 2020",
    journal: "American Journal of Gastroenterology",
    sample: "n = 51 IBS",
    body: "Protocole de référence pour le suivi alimentaire corrélé aux symptômes. L'enregistrement en temps réel réduit le biais de rappel. Les symptômes FAST montrent des corrélations modérées (r = 0.30–0.48) avec les échelles validées GSRS et PROMIS-GI.",
    highlight: "C'est ce protocole qui définit nos 12 symptômes et la logique d'horodatage.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6970560/",
    color: "#81B29A",
  },
  {
    n: 2,
    title: "Relations alimentation, stress et symptômes gastro-intestinaux",
    authors: "Clevers et al., 2019",
    journal: "United European Gastroenterology Journal",
    sample: "n = 163 · 5 semaines",
    body: "L'étude fondatrice de notre algorithme de corrélation. 163 journaux via l'app mySymptoms. Résultats : associations alimentaires chez 73% des sujets pour les brûlures d'estomac, 67% pour l'inconfort, 57% pour la diarrhée, 53% pour le ballonnement.",
    highlight: "Méthode clé : score delta (sévérité post-ingestion 8h minus pré-ingestion 8h), validé par 10 000 permutations.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6683644/",
    color: "#E07A5F",
  },
  {
    n: 3,
    title: "Des journaux alimentaires aux conseils personnalisés validés",
    authors: "Clevers et al., 2020",
    journal: "Neurogastroenterology & Motility",
    sample: "n = 209 · 3 cohortes",
    body: "Preuve que l'approche par journal produit des résultats actionnables. Les chercheurs ont extrait des triggers individuels sur un jeu d'entraînement puis validé leur prédictivité sur un jeu de test, complété par une méta-analyse à effets aléatoires.",
    highlight: "C'est cette étude qui justifie que 3–4 semaines de données suffisent.",
    url: "https://pubmed.ncbi.nlm.nih.gov/32031756/",
    color: "#D4A017",
  },
  {
    n: 4,
    title: "Régime FODMAP à grande échelle — validation par app mobile",
    authors: "Iacovou et al., 2023",
    journal: "Nutrients (MDPI)",
    sample: "n = 21 462",
    body: "La plus grande étude en conditions réelles sur le lien alimentation-symptômes. Après restriction FODMAP : symptômes globaux de 57% à 44%, douleurs de 40% à 33%, ballonnement de 55% à 44%. Les 5 triggers les plus fréquents : blé (41%), oignon (39%), lait (40%), ail (35%), pâtes (41%).",
    highlight: "C'est cette étude qui fonde notre dictionnaire FODMAP et le regroupement par famille.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10305236/",
    color: "#8D99AE",
  },
  {
    n: 5,
    title: "Le piège du décalage temporel (time-lag)",
    authors: "Monash University, 2016",
    journal: "FODMAP Research Group — Blog clinique",
    sample: null,
    body: "Mise en garde fondamentale de l'équipe Monash : la digestion prend des heures à des jours, les symptômes ressentis au moment d'un repas peuvent provenir des repas précédents.",
    highlight: "C'est pourquoi Mieux Demain utilise une fenêtre de corrélation décalée, pas une association instantanée.",
    url: "https://www.monashfodmap.com/blog/timing-of-symptoms/",
    color: "#9575CD",
  },
];

const SYMPTOMS = [
  "😣 Douleur abdominale", "💨 Gaz / flatulences", "🎈 Ballonnement",
  "🤢 Nausée / vomissement", "😴 Fatigue", "🔥 Brûlures / reflux",
  "💧 Diarrhée", "😕 Inconfort abdominal", "🫧 Éructations",
  "🤕 Maux de tête", "🧱 Constipation", "😰 Stress / détresse",
];

const SEVERITY = [
  { score: "2.5", label: "Léger", desc: "Gênant mais supportable", bg: "#F0FFF4", border: "#C6F6D5" },
  { score: "5.0", label: "Modéré", desc: "Perturbe mes activités",  bg: "#FFFFF0", border: "#FEFCBF" },
  { score: "7.5", label: "Sévère", desc: "Doit m'arrêter",         bg: "#FFF5F5", border: "#FED7D7" },
  { score: "10",  label: "Insupportable", desc: "Besoin d'aide",   bg: "#FFF0F0", border: "#FECACA" },
];

const HONESTY = [
  { emoji: "🔬", title: "Pas un diagnostic", body: "L'appli identifie des coïncidences répétées, pas des causes certaines. Un ingrédient \"suspect\" peut l'être parce qu'il accompagne souvent un autre aliment réellement problématique." },
  { emoji: "⏳", title: "Besoin de temps",    body: "Les résultats ne sont fiables qu'à partir d'environ 3 semaines de journal régulier. Minimum 5 repas et 3 symptômes pour que le calcul se lance." },
  { emoji: "👨‍⚕️", title: "Pas un médecin",   body: "Si tu souffres régulièrement, consulte un gastro-entérologue. L'appli peut t'apporter des éléments concrets à lui soumettre." },
  { emoji: "🔒", title: "Données locales",    body: "Rien n'est envoyé à un serveur. Tout reste sur ton téléphone. Ta vie digestive t'appartient." },
];

const SUMMARY = [
  { icon: "🎯", label: "Pour qui",          value: "Toute personne qui souffre de troubles digestifs et veut comprendre d'où ça vient." },
  { icon: "⏱️", label: "Temps nécessaire",  value: "3 à 4 semaines de journal régulier pour des résultats exploitables." },
  { icon: "📋", label: "Ce qu'on obtient",  value: "Une liste d'ingrédients suspects, classés par score de suspicion et groupés par famille biochimique (FODMAP)." },
  { icon: "🔬", label: "Base scientifique", value: "Protocoles Clevers et al. (2019, 2020), FAST diary, Monash FODMAP — validés sur plus de 21 000 patients." },
  { icon: "⚠️", label: "Ce que ce n'est pas", value: "Un diagnostic médical, ni un substitut à un professionnel de santé." },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#81B29A", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ display: "inline-block", width: 16, height: 2, background: "#81B29A", borderRadius: 2 }} />
      {children}
    </p>
  );
}

function SectionTitle({ children }) {
  return <h2 style={{ fontFamily: "Sora, sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px", color: "#2B2D42", marginBottom: 10 }}>{children}</h2>;
}

function Card({ children, style }) {
  return <div style={{ background: "#fff", border: "1px solid #F0E6D8", borderRadius: 16, padding: "16px", marginBottom: 10, ...style }}>{children}</div>;
}

function Divider() {
  return <div style={{ height: 1, background: "#F0E6D8", margin: "24px 0" }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InfoPanel({ onClose }) {
  return (
    <div className="gf-abs" style={{ zIndex: 70, background: "#FFFBF5", overflowY: "auto" }}>
      {/* Header */}
      <div className="gf-header" style={{ position: "sticky", top: 0, zIndex: 10, background: "#FFFBF5" }}>
        <button onClick={onClose} className="gf-back-btn">
          <ChevronLeft size={20} /> Retour
        </button>
        <h1 className="gf-title">À propos</h1>
        <div style={{ width: 80 }} />
      </div>

      <div style={{ padding: "0 16px 48px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", padding: "24px 0 20px" }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🍽️</div>
          <h1 style={{ fontFamily: "Sora, sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-1px", color: "#2B2D42", marginBottom: 6 }}>
            Mieux Demain
          </h1>
          <p style={{ fontSize: 13, color: "#8D99AE", fontStyle: "italic", lineHeight: 1.5, maxWidth: 280, margin: "0 auto 12px" }}>
            Ton journal de bord intelligent pour comprendre ce qui te fait du mal — et t'en libérer.
          </p>
          <span style={{ fontSize: 11, padding: "5px 14px", borderRadius: 99, background: "#EEF5F0", border: "1px solid #C8DDD0", color: "#81B29A", fontWeight: 600 }}>
            🫶 Application de suivi digestif
          </span>
        </div>

        <Divider />

        {/* ── Concept ── */}
        <SectionLabel>Le concept</SectionLabel>
        <SectionTitle>Une enquête alimentaire, simplifiée à l'extrême</SectionTitle>
        <p style={{ fontSize: 13, color: "#5C5470", lineHeight: 1.65, marginBottom: 20 }}>
          Tu notes ce que tu manges et quand tu as un symptôme digestif. Après quelques semaines, l'appli te dit quels ingrédients reviennent systématiquement avant tes douleurs — et lesquels sont probablement innocents.
        </p>

        {/* Features */}
        {[
          { icon: "🎙️", title: "Parler un repas",       body: "Dis ce que tu as mangé — l'IA décompose automatiquement en ingrédients individuels catégorisés." },
          { icon: "📷", title: "Scanner un produit",     body: "Scanne un code-barres, l'appli récupère la composition complète via OpenFoodFacts : ingrédients, additifs, allergènes." },
          { icon: "😣", title: "Signaler un symptôme",   body: "12 types de symptômes issus du protocole FAST, 4 niveaux d'intensité, localisation abdominale et échelle de Bristol." },
          { icon: "🔍", title: "Voir les suspects",      body: "Ingrédients classés du plus au moins suspect, avec fréquence d'apparition avant chaque symptôme et regroupement FODMAP." },
          { icon: "📊", title: "Exporter ses données",   body: "Fichier CSV prêt à envoyer à un gastro-entérologue ou un nutritionniste." },
        ].map(f => (
          <Card key={f.title}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 3 }}>{f.title}</p>
                <p style={{ fontSize: 12, color: "#8D99AE", lineHeight: 1.55 }}>{f.body}</p>
              </div>
            </div>
          </Card>
        ))}

        <Divider />

        {/* ── Algorithme ── */}
        <SectionLabel>Comment ça marche</SectionLabel>
        <SectionTitle>Un algorithme simple, une logique robuste</SectionTitle>

        <Card style={{ borderLeft: "3px solid #81B29A", background: "#F0F8F4" }}>
          <p style={{ fontSize: 13, fontStyle: "italic", color: "#5A8F7B", lineHeight: 1.6 }}>
            "Combien de fois ai-je eu ce symptôme dans les heures suivant un repas qui contenait cet ingrédient ?"
          </p>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <Card style={{ background: "#EEF5F0", border: "1px solid #C8DDD0" }}>
            <p style={{ fontWeight: 700, fontSize: 12, color: "#5A8F7B", marginBottom: 4 }}>📈 Fréquence</p>
            <p style={{ fontSize: 11, color: "#5C5470", lineHeight: 1.5 }}>Cet ingrédient précède-t-il souvent tes symptômes, par rapport au nombre de fois où tu le manges ?</p>
          </Card>
          <Card style={{ background: "#EEF5F0", border: "1px solid #C8DDD0" }}>
            <p style={{ fontWeight: 700, fontSize: 12, color: "#5A8F7B", marginBottom: 4 }}>⚡ Sévérité</p>
            <p style={{ fontSize: 11, color: "#5C5470", lineHeight: 1.5 }}>Quand il précède un symptôme, est-ce fort ou faible ? Une douleur intense pèse plus qu'une gêne légère.</p>
          </Card>
        </div>

        <Card style={{ background: "#FFF8E1", border: "1px solid #FFE082" }}>
          <p style={{ fontSize: 12, color: "#5C5470", lineHeight: 1.6 }}>
            <strong style={{ color: "#E07A5F" }}>Exemple concret :</strong> Un ingrédient mangé 10 fois qui précède 8 fois une douleur intense sera bien plus suspect qu'un ingrédient mangé 10 fois qui précède 2 fois une gêne légère.
          </p>
        </Card>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, marginBottom: 6 }}>
          {[
            { label: "🔴 ≥ 75% — Très suspect", bg: "#FEE2E2", color: "#B91C1C" },
            { label: "🟠 ≥ 50% — Suspect",       bg: "#FFEDD5", color: "#C2410C" },
            { label: "🟡 ≥ 25% — À surveiller",  bg: "#FEF9C3", color: "#A16207" },
            { label: "⚪ < 25% — Faible",         bg: "#F3F4F6", color: "#6B7280" },
          ].map(p => (
            <span key={p.label} style={{ fontSize: 11, padding: "5px 10px", borderRadius: 99, background: p.bg, color: p.color, fontWeight: 600 }}>{p.label}</span>
          ))}
        </div>

        <Divider />

        {/* ── Protocole ── */}
        <SectionLabel>Saisie des symptômes</SectionLabel>
        <SectionTitle>12 symptômes, calibrés sur la recherche</SectionTitle>
        <p style={{ fontSize: 12, color: "#8D99AE", marginBottom: 12, lineHeight: 1.5 }}>
          La liste des symptômes et l'échelle de sévérité sont alignées sur les protocoles validés en gastro-entérologie.
        </p>

        <Card>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8D99AE", marginBottom: 10 }}>Types de symptômes trackés</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SYMPTOMS.map(s => (
              <span key={s} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: "#EEF5F0", border: "1px solid #C8DDD0", color: "#2B2D42", fontWeight: 500 }}>{s}</span>
            ))}
          </div>
        </Card>

        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8D99AE", margin: "14px 0 8px" }}>Échelle de sévérité (score interne)</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          {SEVERITY.map(s => (
            <div key={s.score} style={{ padding: "14px 12px", borderRadius: 14, background: s.bg, border: `1px solid ${s.border}`, textAlign: "center" }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{s.score}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#5C5470", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: "#8D99AE", lineHeight: 1.3 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── Science ── */}
        <SectionLabel>Fondements scientifiques</SectionLabel>
        <SectionTitle>Pas du doigt mouillé — de la recherche publiée</SectionTitle>
        <p style={{ fontSize: 12, color: "#8D99AE", lineHeight: 1.55, marginBottom: 14 }}>
          La méthodologie de Mieux Demain s'appuie sur des protocoles validés et publiés dans des revues à comité de relecture. Voici les 5 études clés qui fondent l'approche.
        </p>

        {STUDIES.map(s => (
          <Card key={s.n} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                {s.n}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: "#2B2D42", marginBottom: 3, lineHeight: 1.3 }}>{s.title}</p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.authors}</span>
                  <span style={{ fontSize: 11, color: "#8D99AE", fontStyle: "italic" }}>· {s.journal}</span>
                  {s.sample && <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: "#EEF5F0", border: "1px solid #C8DDD0", color: "#81B29A", fontWeight: 600 }}>{s.sample}</span>}
                </div>
                <p style={{ fontSize: 11, color: "#5C5470", lineHeight: 1.55, marginBottom: 5 }}>{s.body}</p>
                <p style={{ fontSize: 11, color: "#2B2D42", fontWeight: 600, marginBottom: 6 }}>{s.highlight}</p>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#81B29A", fontWeight: 600, textDecoration: "none" }}>
                  Lire l'étude <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </Card>
        ))}

        <Card style={{ background: "#EEF5F0", border: "1px solid #C8DDD0" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>🧬</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 12, color: "#2B2D42", marginBottom: 4 }}>Ce que ça veut dire pour toi</p>
              <p style={{ fontSize: 11, color: "#5C5470", lineHeight: 1.55 }}>
                Mieux Demain ne réinvente pas la roue. L'app applique à l'échelle individuelle des protocoles validés sur des centaines de patients dans des études cliniques publiées. Le delta post-pré, la fenêtre temporelle décalée, le regroupement FODMAP — tout ça vient directement de la littérature scientifique, pas d'une intuition de développeur.
              </p>
            </div>
          </div>
        </Card>

        <Divider />

        {/* ── Honnêteté ── */}
        <SectionLabel>En toute honnêteté</SectionLabel>
        <SectionTitle>Ce que l'appli ne fait pas</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          {HONESTY.map(h => (
            <Card key={h.title} style={{ margin: 0 }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{h.emoji}</div>
              <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{h.title}</p>
              <p style={{ fontSize: 11, color: "#8D99AE", lineHeight: 1.5 }}>{h.body}</p>
            </Card>
          ))}
        </div>

        <Divider />

        {/* ── Résumé ── */}
        <SectionLabel>En résumé</SectionLabel>
        <SectionTitle>L'essentiel en un coup d'œil</SectionTitle>
        <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #F0E6D8", marginBottom: 24 }}>
          {SUMMARY.map((row, i) => (
            <div key={row.label} style={{ display: "flex", borderBottom: i < SUMMARY.length - 1 ? "1px solid #F0E6D8" : "none" }}>
              <div style={{ flexShrink: 0, width: 130, padding: "14px 12px", background: "#EEF5F0", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>{row.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#5A8F7B", lineHeight: 1.3 }}>{row.label}</span>
              </div>
              <div style={{ flex: 1, padding: "14px 12px" }}>
                <p style={{ fontSize: 11, color: "#5C5470", lineHeight: 1.5 }}>{row.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <p style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: "#81B29A", marginBottom: 4 }}>Mieux Demain</p>
          <p style={{ fontSize: 11, color: "#8D99AE" }}>Un journal de bord intelligent, pas un diagnostic médical.</p>
          <p style={{ fontSize: 11, color: "#B0A090", marginTop: 6 }}>v{version}</p>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 11, padding: "6px 14px", borderRadius: 99, background: "#EEF5F0", border: "1px solid #C8DDD0", color: "#81B29A", fontWeight: 600 }}>
            🔒 Tes données restent sur ton téléphone
          </span>
        </div>

      </div>
    </div>
  );
}
