import { X, ExternalLink } from "lucide-react";
import pkg from "../../../package.json";

const STUDIES = [
  {
    n: 1,
    title: "Validation du journal FAST (Food And Symptom Times)",
    authors: "Guo et al., 2020",
    journal: "American Journal of Gastroenterology",
    sample: "n = 51 IBS",
    body: "Protocole de référence pour le suivi alimentaire corrélé aux symptômes. L'enregistrement en temps réel réduit le biais de rappel.",
    highlight: "Définit nos 12 types de symptômes et la logique d'horodatage.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6970560/",
  },
  {
    n: 2,
    title: "Relations alimentation, stress et symptômes gastro-intestinaux",
    authors: "Clevers et al., 2019",
    journal: "United European Gastroenterology Journal",
    sample: "n = 163 · 5 semaines",
    body: "Étude fondatrice de notre algorithme de corrélation. Associations alimentaires retrouvées chez 73% des sujets pour les brûlures, 67% pour l'inconfort, 57% pour la diarrhée.",
    highlight: "Score delta validé par 10 000 permutations.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6683644/",
  },
  {
    n: 3,
    title: "Des journaux alimentaires aux conseils personnalisés validés",
    authors: "Clevers et al., 2020",
    journal: "Neurogastroenterology & Motility",
    sample: "n = 209 · 3 cohortes",
    body: "Preuve que l'approche par journal produit des résultats actionnables. Triggers individuels extraits sur un jeu d'entraînement, validés sur jeu de test.",
    highlight: "Justifie que 3–4 semaines de données suffisent.",
    url: "https://pubmed.ncbi.nlm.nih.gov/32031756/",
  },
  {
    n: 4,
    title: "Régime FODMAP à grande échelle — validation par app mobile",
    authors: "Iacovou et al., 2023",
    journal: "Nutrients (MDPI)",
    sample: "n = 21 462",
    body: "Plus grande étude en conditions réelles sur le lien alimentation-symptômes. Top 5 triggers : blé (41%), pâtes (41%), lait (40%), oignon (39%), ail (35%).",
    highlight: "Fonde notre dictionnaire FODMAP et le regroupement par famille.",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10305236/",
  },
  {
    n: 5,
    title: "Le piège du décalage temporel (time-lag)",
    authors: "Monash University, 2016",
    journal: "FODMAP Research Group",
    sample: null,
    body: "Mise en garde de l'équipe Monash : la digestion prend des heures à des jours, les symptômes peuvent provenir des repas précédents.",
    highlight: "Pourquoi on utilise une fenêtre de corrélation décalée de 24h, pas une association instantanée.",
    url: "https://www.monashfodmap.com/blog/timing-of-symptoms/",
  },
];

export default function AboutSheet({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh" }}>
        <div className="modal-handle" />

        <div className="settings-header">
          <h2 className="headline-md">À propos</h2>
          <button className="app-icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <p className="body-md" style={{ marginTop: 12 }}>
          <strong>Mieux Demain</strong> est un journal alimentaire pour identifier vos intolérances digestives par corrélation. Toutes vos données restent sur votre appareil.
        </p>

        <p className="section-label">Bases scientifiques</p>
        <div className="about-studies">
          {STUDIES.map(s => (
            <div key={s.n} className="about-study">
              <div className="about-study-header">
                <span className="about-study-number">{s.n}</span>
                <div className="about-study-headinfo">
                  <div className="about-study-title">{s.title}</div>
                  <div className="about-study-meta">{s.authors} · {s.journal}{s.sample ? ` · ${s.sample}` : ""}</div>
                </div>
              </div>
              <p className="about-study-body">{s.body}</p>
              {s.highlight && <p className="about-study-highlight">→ {s.highlight}</p>}
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="settings-link" style={{ marginTop: 8 }}>
                <ExternalLink size={12} /> Lire l'étude
              </a>
            </div>
          ))}
        </div>

        <p className="section-label">Limites</p>
        <p className="body-md text-muted">
          Mieux Demain n'est pas un diagnostic médical. Les suspects identifiés sont des indicateurs statistiques. En cas de symptômes persistants, consultez un médecin ou un diététicien.
        </p>

        <p className="settings-version" style={{ marginTop: 24 }}>
          Mieux Demain v{pkg.version}
        </p>
      </div>
    </div>
  );
}
