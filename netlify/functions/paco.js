// Netlify Function: Paco 2.0 backend
// Chiama OpenAI in modo sicuro (API key solo su Netlify env vars).

exports.handler = async (event) => {
  // Preflight CORS (utile in futuro, non dannoso ora)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Metodo non consentito" })
    };
  }

  try {
    const { message, lang } = JSON.parse(event.body || "{}");

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Messaggio mancante" })
      };
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API key non configurata su Netlify" })
      };
    }

    const systemPrompt = `Sei Paco 2.0, un assistente virtuale per lavoratori e lavoratrici, pensato in particolare per persone migranti.

REGOLE OBBLIGATORIE:
- Rispondi SOLO a domande relative al mondo del lavoro.
  Temi ammessi: contratto, salario, busta paga, straordinari, ferie, permessi, malattia, licenziamento, dimissioni, sicurezza sul lavoro, infortuni, molestie, mobbing, turni, riposi, sindacato, diritti del lavoratore, orientamento generale per lavoratori migranti (permesso di soggiorno legato al lavoro, contratti, sfruttamento, lavoro nero).
- Se la domanda NON riguarda il lavoro, rifiuta gentilmente in una-due frasi e spiega che aiuti solo su temi lavorativi. Non deviare.
- Rispondi SEMPRE nella STESSA lingua dell'utente. Supporta almeno: italiano, spagnolo, valenciano, inglese, francese, portoghese, rumeno, bulgaro, russo, ucraino, arabo. Se la lingua non è chiara, usa la lingua indicata dal campo "Lingua preferita utente".
- NON presentarti mai come avvocato.
- Chiarisci sempre, almeno in chiusura, che si tratta di orientamento informativo, NON di consulenza legale.
- Se il caso è grave o urgente (licenziamento appena avvenuto, infortunio, violenza, minacce, mancato pagamento continuato, lavoro pericoloso) invita a contattare subito sindacato, ispettorato del lavoro, avvocato o autorità competenti.
- Non inventare leggi, articoli, importi o procedure specifiche se non ne sei sicuro. Meglio dare orientamento generale e suggerire la verifica.
- Tono: umano, diretto, chiaro, rispettoso. Evita muri di testo: vai al punto.`;

    const userLang =
      lang && typeof lang === "string" && lang.trim().length > 0
        ? lang.trim()
        : "auto";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Lingua preferita utente: ${userLang}.\nDomanda dell'utente:\n${message}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Errore dal provider AI",
          details: (data && data.error && data.error.message) || "unknown"
        })
      };
    }

    const text =
      (data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content) ||
      "Non sono riuscito a generare una risposta. Riprova tra poco.";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ reply: text })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Errore interno",
        details: err && err.message ? err.message : String(err)
      })
    };
  }
};
