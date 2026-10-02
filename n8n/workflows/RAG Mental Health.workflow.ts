const embeddings_Gemini_Recherche = embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini', version: 1, config: { name: 'Embeddings Gemini (Recherche)', parameters: { modelName: 'models/gemini-embedding-2' }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'oewWUKLTw4zHgfP9') }, position: [208, 528] } });

const upload_Livre_PDF = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: { name: 'Upload Livre PDF', parameters: { formTitle: 'RAG Livre — Ingestion', formDescription: 'Déposez un PDF pour l\'ajouter à la base de connaissance RAG.', formFields: { values: [{ fieldLabel: 'Titre du document', requiredField: true }, { fieldLabel: 'Fichier PDF', fieldType: 'file', acceptFileTypes: '.pdf', requiredField: true }] }, options: {} }, position: [-1120, 64], webhookId: 'bc3ad0d1-2448-4a7d-8ead-c0764091327b' }
});

const extraire_Texte_PDF = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1.1,
  config: { name: 'Extraire Texte PDF', parameters: { operation: 'pdf', binaryPropertyName: 'Fichier_PDF', options: {} }, position: [-896, 64], notes: 'binaryPropertyName "Fichier_PDF" confirmé fonctionnel par test réel.', notesInFlow: true }
});

const nettoyer_Et_Structurer = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Nettoyer Et Structurer', parameters: { jsCode: '// IMPORTANT : "Extraire Texte PDF" (opération pdf) met le texte extrait dans le champ\n// `text`, pas dans `data`.\nconst raw = $input.first().json.text || $input.first().json.data || \'\';\nconst titre = $(\'Upload Livre PDF\').item.json[\'Titre du document\'] || \'Document\';\nconst lines = raw.split(\'\\n\').map(l => l.trim());\n\nfunction isPageNum(s) {\n  if (!s || s.length > 12) return false;\n  return /^\\d{1,4}$/.test(s) || /^[ivxlcdmIVXLCDM]{1,7}$/.test(s);\n}\n\nfunction headingLevel(s) {\n  if (!s || s.length > 90) return null;\n  if (/[.,;:]$/.test(s)) return null;\n  const letters = s.replace(/[^a-zA-ZÀ-ÿ]/g, \'\');\n  if (!letters) return null;\n  const upper = letters.replace(/[^A-ZÀ-Ý]/g, \'\').length;\n  const upperRatio = upper / letters.length;\n  const words = s.split(/\\s+/);\n  if (upperRatio > 0.9 && words.length <= 10) return \'H1\';\n  const capWords = words.filter(w => /^[A-ZÀ-Ý]/.test(w)).length;\n  if (words.length <= 14 && capWords / words.length > 0.7) return \'H2\';\n  return null;\n}\n\nconst outParts = [];\nlet buffer = [];\n\nfunction flushParagraph() {\n  if (buffer.length) {\n    outParts.push(buffer.join(\' \').trim());\n    buffer = [];\n  }\n}\n\nfor (const line of lines) {\n  if (!line || isPageNum(line)) {\n    flushParagraph();\n    continue;\n  }\n  const level = headingLevel(line);\n  if (level && buffer.length === 0) {\n    outParts.push((level === \'H1\' ? \'## \' : \'### \') + line);\n    continue;\n  }\n  buffer.push(line);\n}\nflushParagraph();\n\nconst markdown = \'# \' + titre + \'\\n\\n\' + outParts.join(\'\\n\\n\');\n\nreturn [{ json: { markdown, titre } }];' }, position: [-672, 64], notes: 'Version JS simplifiée du script Python validé plus tôt.', notesInFlow: true }
});

const chunking_Avanc = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Chunking Avancé', parameters: { jsCode: 'const MAX_CHARS = 900;\nconst OVERLAP_CHARS = 150;\nconst { titre, markdown } = $input.first().json;\n\nconst lines = (markdown || \'\').split(\'\\n\');\nconst sections = [];\nlet current = { title: titre || \'Document\', content: [] };\nfor (const line of lines) {\n  const m = line.match(/^(#{2,3})\\s+(.*)/);\n  if (m) {\n    if (current.content.length) sections.push(current);\n    current = { title: m[2].trim(), content: [] };\n  } else {\n    current.content.push(line);\n  }\n}\nif (current.content.length) sections.push(current);\n\nfunction splitBySentence(paragraph, maxChars) {\n  const sentences = paragraph.match(/[^.!?]+[.!?]+(\\s|$)/g) || [paragraph];\n  const chunks = [];\n  let buf = \'\';\n  for (const s of sentences) {\n    if ((buf + s).length > maxChars && buf) {\n      chunks.push(buf.trim());\n      buf = s;\n    } else {\n      buf += s;\n    }\n  }\n  if (buf.trim()) chunks.push(buf.trim());\n  return chunks;\n}\n\nfunction lastWords(text, maxChars) {\n  if (text.length <= maxChars) return text;\n  const slice = text.slice(-maxChars);\n  const spaceIdx = slice.indexOf(\' \');\n  return spaceIdx === -1 ? slice : slice.slice(spaceIdx + 1);\n}\n\nconst chunks = [];\nlet chunkIndex = 0;\n\nfunction pushChunk(sectionTitle, text, overlapPrefix) {\n  const body = text.trim();\n  if (!body) return null;\n  const withOverlap = overlapPrefix ? overlapPrefix + \' […] \' + body : body;\n  const chunkText = \'## \' + sectionTitle + \'\\n\\n\' + withOverlap;\n  chunks.push({\n    chunkText,\n    titre,\n    sectionTitle,\n    chunkIndex: chunkIndex++,\n    charCount: chunkText.length,\n    approxTokens: Math.ceil(chunkText.length / 4)\n  });\n  return body;\n}\n\nfor (const section of sections) {\n  const paragraphs = section.content.join(\'\\n\').split(/\\n\\s*\\n/).map(p => p.trim()).filter(Boolean);\n  let buf = \'\';\n  let previousBody = null;\n  const flush = () => {\n    if (!buf.trim()) return;\n    const overlap = previousBody ? lastWords(previousBody, OVERLAP_CHARS) : null;\n    previousBody = pushChunk(section.title, buf, overlap);\n    buf = \'\';\n  };\n  for (const para of paragraphs) {\n    if (para.length > MAX_CHARS) {\n      flush();\n      for (const sub of splitBySentence(para, MAX_CHARS)) {\n        const overlap = previousBody ? lastWords(previousBody, OVERLAP_CHARS) : null;\n        previousBody = pushChunk(section.title, sub, overlap);\n      }\n      continue;\n    }\n    if (buf && (buf + \'\\n\\n\' + para).length > MAX_CHARS) {\n      flush();\n      buf = para;\n    } else {\n      buf = buf ? buf + \'\\n\\n\' + para : para;\n    }\n  }\n  flush();\n}\n\nreturn [{ json: { chunks } }];' }, position: [-448, 64], notes: 'Découpage sémantique (section → paragraphe → phrase) + chevauchement. Renvoie 1 item avec un tableau `chunks` — "Séparer Chunks" (Split Out) juste après déroule en N items.', notesInFlow: true }
});

const s_parer_Chunks = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: { name: 'Séparer Chunks', parameters: { fieldToSplitOut: 'chunks', options: {} }, position: [-224, 64], notesInFlow: true }
});

const limiter_Chunks = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limiter Chunks', parameters: { maxItems: 50 }, position: [0, 64], notesInFlow: true }
});

const extraire_Mots_Cl_s = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Extraire Mots-Clés', parameters: { mode: 'runOnceForEachItem', jsCode: '// Augmentation : mots-clés par fréquence (pas de LLM, déterministe), stockés dans\n// metadata.keywords pour alimenter la recherche plein texte côté Postgres.\nconst STOPWORDS = new Set((\n  \'le la les un une des de du d l et en au aux ce cet cette ces que qui quoi dont ou \' +\n  \'a à pour par sur avec sans sous dans ne pas plus moins tres tout tous toute toutes son sa ses leur leurs \' +\n  \'the a an of to in on at for with without into onto from by as is are was were be been being this that these those \' +\n  \'and or but if then than so such not no nor it its he she they them his her their our your my we you i \' +\n  \'which who whom whose what when where why how all each every both few more most other some any only own same also\'\n).split(/\\s+/));\n\nconst text = $json.chunkText || \'\';\nconst topN = 8;\n\nconst words = text\n  .toLowerCase()\n  .normalize(\'NFD\').replace(/[\\u0300-\\u036f]/g, \'\')\n  .replace(/[^a-z0-9\\s-]/g, \' \')\n  .split(/\\s+/)\n  .filter(w => w.length >= 4 && !STOPWORDS.has(w));\n\nconst freq = {};\nfor (const w of words) freq[w] = (freq[w] || 0) + 1;\n\nconst keywords = Object.entries(freq)\n  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))\n  .slice(0, topN)\n  .map(([w]) => w);\n\nreturn { json: { ...$json, keywords, keywordsText: keywords.join(\' \') } };' }, position: [224, 64], notesInFlow: true }
});

const appeler_Embedding_Gemini = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'Appeler Embedding Gemini', parameters: { method: 'POST', url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent', authentication: 'predefinedCredentialType', nodeCredentialType: 'googlePalmApi', sendBody: true, specifyBody: 'json', jsonBody: expr('{{ JSON.stringify({ content: { parts: [ { text: $json.chunkText } ] } }) }}'), options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'oewWUKLTw4zHgfP9') }, position: [448, 64], notes: 'Retour à l\'appel direct (le nœud natif Vector Store insert produisait des vecteurs vides de façon intermittente, cause non identifiée à temps pour la deadline) — méthode déjà prouvée fonctionnelle plus tôt dans cette session.', notesInFlow: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 8000 }
});

const pr_parer_Insertion_Hybride = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer Insertion Hybride', parameters: { mode: 'runOnceForEachItem', jsCode: 'const chunk = $(\'Extraire Mots-Clés\').item.json;\nconst embeddingValues = $json.embedding.values;\n\nconst payload = {\n  content: chunk.chunkText,\n  metadata: {\n    titre: chunk.titre,\n    sectionTitle: chunk.sectionTitle,\n    chunkIndex: chunk.chunkIndex,\n    keywords: chunk.keywordsText\n  },\n  embedding: embeddingValues\n};\n\nreturn { json: { payload: JSON.stringify(payload) } };' }, position: [672, 64], notesInFlow: true }
});

const ins_rer_Document_Hybride = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Insérer Document Hybride', parameters: { operation: 'executeQuery', query: 'insert into documents (content, metadata, embedding)\nselect\n  payload->>\'content\',\n  (payload->\'metadata\')::jsonb,\n  (payload->>\'embedding\')::vector\nfrom (select $1::jsonb as payload) t;', options: { queryReplacement: expr('{{ $json.payload }}') } }, credentials: { postgres: newCredential('Postgres account', 'BSGtZRDD9rj4tTnF') }, position: [896, 64], notes: 'keywords stocké dans metadata (pas une colonne séparée), cohérent avec le schéma actuel de content_tsv.', notesInFlow: true }
});

const recevoir_Message = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.5,
  config: { name: 'Recevoir Message', parameters: { availableInChat: true, agentName: 'RAG Livre', agentDescription: 'Pose des questions sur les documents ingérés via la chaîne Upload Livre PDF ci-dessus.', options: { responseMode: 'lastNode' } }, position: [-1120, 544], webhookId: '280d912c-cc7c-46b7-a5f8-9097b3d69a47', notes: 'responseMode "lastNode" : le dernier nœud exécuté doit renvoyer { output: "<texte>" }.', notesInFlow: true }
});

const r_cup_rer_Contexte = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Récupérer Contexte', parameters: { operation: 'executeQuery', query: 'select role, content from chat_messages where session_id = $1 order by created_at asc limit 20;', options: { queryReplacement: expr('{{ $json.sessionId }}') } }, credentials: { postgres: newCredential('Postgres account', 'BSGtZRDD9rj4tTnF') }, position: [-896, 544], notes: 'alwaysOutputData=true : sans ça, 0 ligne (nouvelle conversation) produit 0 item et n8n arrête toute la chaîne ("No item to return was found").', notesInFlow: true, alwaysOutputData: true }
});

const agr_ger_Historique = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Agréger Historique', parameters: { jsCode: '// Format plat {role, content} attendu par le nœud natif "Google Gemini" (messages.values).\nconst rows = $input.all().filter(r => r.json && r.json.content);\nconst historyMessages = rows.map(r => ({\n  role: r.json.role === \'assistant\' ? \'model\' : \'user\',\n  content: r.json.content\n}));\n\nconst trigger = $(\'Recevoir Message\').item.json;\n\nreturn [{ json: {\n  sessionId: trigger.sessionId,\n  chatInput: trigger.chatInput,\n  historyMessages\n} }];' }, position: [-672, 544], notesInFlow: true }
});

const router_La_Requ_te = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: { name: 'Router La Requête', parameters: { modelId: { __rl: true, mode: 'id', value: 'models/gemini-flash-lite-latest' }, messages: { values: [{ content: expr('{{ ($json.historyMessages.length ? $json.historyMessages.map(h => (h.role === "model" ? "Assistant" : "Utilisateur") + ": " + h.content).join("\\n") + "\\n" : "") + "Utilisateur: " + $json.chatInput }}') }] }, simplify: false, builtInTools: {}, options: { systemMessage: 'Reformule la dernière question de l\'utilisateur en une requête de recherche autonome et explicite, en te servant de l\'historique ci-dessus pour résoudre les pronoms et références implicites. Réponds UNIQUEMENT avec la requête reformulée, sans aucun autre texte, sans guillemets.', maxOutputTokens: 200 } }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'oewWUKLTw4zHgfP9') }, position: [-448, 544], notes: 'Étape "Routing" : nœud natif Google Gemini. "messages.values" est un tableau FIXE à une entrée ; seul son champ "content" (une simple chaîne) est dynamique — un remplacement du tableau entier par une expression ne fonctionne pas sur ce type de paramètre (testé : ça retombait sur [{}]).', notesInFlow: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 8000 }
});

const extraire_Requ_te_Reformul_e = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Extraire Requête Reformulée', parameters: { mode: 'runOnceForEachItem', jsCode: 'const text = ($json.candidates?.[0]?.content?.parts?.[0]?.text || $json.content || $json.text || \'\').trim();\nconst ctx = $(\'Agréger Historique\').item.json;\n\nreturn { json: {\n  sessionId: ctx.sessionId,\n  chatInput: ctx.chatInput,\n  historyMessages: ctx.historyMessages,\n  searchQuery: text || ctx.chatInput\n} };' }, position: [-96, 544], notes: 'Repli sur la question brute si la réponse de Gemini n\'est pas exploitable. Gère plusieurs formats de réponse possibles (simplify:false attendu, mais robustesse en plus).', notesInFlow: true }
});

const rechercher_Vecteurs = node({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: { name: 'Rechercher Vecteurs', parameters: { mode: 'load', tableName: { __rl: true, mode: 'id', value: 'documents' }, prompt: expr('{{ $json.searchQuery }}'), topK: 20, options: {} }, credentials: { supabaseApi: newCredential('Supabase account', 'uvMCNf5EnnE63a6y') }, position: [128, 288], notes: 'Étape "Search" (moitié vecteur) : nœud natif, calcule l\'embedding de searchQuery ET fait la recherche de similarité, en un seul nœud, sans HTTP Request. Retry ajouté pour absorber les 429 ("too many requests") transitoires de l\'API Gemini.', notesInFlow: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 8000, subnodes: { embedding: embeddings_Gemini_Recherche } }
});

const tagger_R_sultats_Vecteurs = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Tagger Résultats Vecteurs', parameters: { jsCode: '// pairedItem explicite : sans ça n8n perd la traçabilité et les nœuds plus loin qui\n// référencent un nœud antérieur par $(\'X\').item plantent ("Paired item data ... is unavailable").\nconst items = $input.all();\nreturn items.map((item, i) => {\n  const doc = item.json.document || item.json;\n  return { json: {\n    content: doc.pageContent || doc.content || \'\',\n    metadata: doc.metadata || {},\n    source: \'vector\',\n    rank: i + 1\n  }, pairedItem: i };\n});' }, position: [480, 400], notesInFlow: true }
});

const fusionner_R_sultats = merge({
  version: 3.2,
  config: { name: 'Fusionner Résultats', position: [704, 544], notes: 'Concatène simplement les deux listes (résultats vecteur + résultats mots-clés) ; le tri/la fusion par score se fait ensuite dans "Reranking (RRF)".', notesInFlow: true }
});

const tagger_R_sultats_Mots_Cl_s = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Tagger Résultats Mots-Clés', parameters: { jsCode: '// alwaysOutputData sur "Rechercher Mots-Clés" peut produire un item vide sans `content`\n// (aucune correspondance mots-clés) : on le filtre pour ne pas polluer le reranking.\nconst items = $input.all().filter(item => item.json && item.json.content);\nreturn items.map((item, i) => ({ json: {\n  content: item.json.content,\n  metadata: item.json.metadata,\n  source: \'keyword\',\n  rank: i + 1\n}, pairedItem: i }));' }, position: [480, 688], notesInFlow: true }
});

const rechercher_Mots_Cl_s = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Rechercher Mots-Clés', parameters: { operation: 'executeQuery', query: 'select content, metadata\nfrom documents\nwhere $1 <> \'\' and content_tsv @@ websearch_to_tsquery(\'french\', $1)\norder by ts_rank(content_tsv, websearch_to_tsquery(\'french\', $1)) desc\nlimit 20;', options: { queryReplacement: expr('{{ $(\'Extraire Requête Reformulée\').item.json.searchQuery }}') } }, credentials: { postgres: newCredential('Postgres account', 'BSGtZRDD9rj4tTnF') }, position: [192, 688], notes: 'Étape "Search" (moitié mots-clés), branche en parallèle de la recherche vectorielle. Référence "Extraire Requête Reformulée" directement (pas $json) pour ne tourner qu\'une fois, peu importe où ce nœud est branché. alwaysOutputData=true : 0 correspondance mots-clés ne doit pas arrêter cette branche (même bug que "Récupérer Contexte").', notesInFlow: true, alwaysOutputData: true }
});

const reranking_RRF = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Reranking (RRF)', parameters: { jsCode: '// Étape "Reranking" : fusionne les deux classements (vecteur + mots-clés) par\n// Reciprocal Rank Fusion (RRF, k=60) — un passage bien classé dans les DEUX méthodes\n// remonte en tête. Les items des deux branches sont regroupés par texte identique\n// (même chunk retrouvé par les deux méthodes).\nconst items = $input.all();\nconst byContent = new Map();\n\nfor (const item of items) {\n  const key = item.json.content;\n  if (!key) continue;\n  if (!byContent.has(key)) {\n    byContent.set(key, { content: item.json.content, metadata: item.json.metadata, rrfScore: 0 });\n  }\n  byContent.get(key).rrfScore += 1 / (60 + item.json.rank);\n}\n\nconst fused = [...byContent.values()].sort((a, b) => b.rrfScore - a.rrfScore).slice(0, 5);\nreturn fused.map(f => ({ json: f, pairedItem: 0 }));' }, position: [928, 544], notesInFlow: true }
});

const formater_Contexte_Documentaire = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Formater Contexte Documentaire', parameters: { jsCode: 'const items = $input.all();\nconst contextText = items.length\n  ? items.map((item, i) => {\n      const meta = item.json.metadata || {};\n      const titre = meta.titre || \'Document\';\n      const section = meta.sectionTitle || \'\';\n      return `[${i + 1}] (${titre}${section ? \' — \' + section : \'\'})\\n${item.json.content}`;\n    }).join(\'\\n\\n---\\n\\n\')\n  : "Aucun passage pertinent trouvé dans la base de connaissance.";\n\nconst ctx = $(\'Extraire Requête Reformulée\').item.json;\n\nreturn [{ json: {\n  sessionId: ctx.sessionId,\n  chatInput: ctx.chatInput,\n  historyMessages: ctx.historyMessages,\n  contextText\n} }];' }, position: [1152, 544], notesInFlow: true }
});

const g_n_rer_R_ponse = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: { name: 'Générer Réponse', parameters: { modelId: { __rl: true, mode: 'id', value: 'models/gemini-flash-lite-latest' }, messages: { values: [{ content: expr('{{ ($json.historyMessages.length ? $json.historyMessages.map(h => (h.role === "model" ? "Assistant" : "Utilisateur") + ": " + h.content).join("\\n") + "\\n" : "") + "Utilisateur: " + $json.chatInput }}') }] }, simplify: false, builtInTools: {}, options: { systemMessage: expr('{{ "Tu réponds aux questions de Romane en te basant uniquement sur les documents trouvés dans le contexte documentaire ci-dessous. Si l\'information n\'y est pas, dis-le clairement plutôt que d\'inventer une réponse." + \'\\n\\nContexte documentaire :\\n\\n\' + $json.contextText }}'), maxOutputTokens: 1024 } }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'oewWUKLTw4zHgfP9') }, position: [1376, 544], notes: 'Étape "Generation" : nœud natif Google Gemini. Même pattern que "Router La Requête" : "messages.values" fixe à une entrée, seul "content" est dynamique.', notesInFlow: true, retryOnFail: true, maxTries: 3, waitBetweenTries: 8000 }
});

const extraire_R_ponse_Finale = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Extraire Réponse Finale', parameters: { mode: 'runOnceForEachItem', jsCode: 'const text = ($json.candidates?.[0]?.content?.parts?.[0]?.text || $json.content || $json.text || \'\').trim()\n  || "Désolée, je n\'ai pas pu générer de réponse.";\nconst ctx = $(\'Formater Contexte Documentaire\').item.json;\n\nreturn { json: { sessionId: ctx.sessionId, chatInput: ctx.chatInput, answerText: text } };' }, position: [1728, 544], notesInFlow: true }
});

const sauvegarder_change = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.7,
  config: { name: 'Sauvegarder Échange', parameters: { operation: 'executeQuery', query: 'insert into chat_messages (session_id, role, content)\nselect payload->>\'sessionId\', \'user\', payload->>\'userMessage\'\nfrom (select $1::jsonb as payload) t\nunion all\nselect payload->>\'sessionId\', \'assistant\', payload->>\'assistantMessage\'\nfrom (select $1::jsonb as payload) t;', options: { queryReplacement: expr('{{ JSON.stringify({ sessionId: $json.sessionId, userMessage: $json.chatInput, assistantMessage: $json.answerText }) }}') } }, credentials: { postgres: newCredential('Postgres account', 'BSGtZRDD9rj4tTnF') }, position: [1952, 544], notesInFlow: true }
});

const pr_parer_R_ponse_Finale = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Préparer Réponse Finale', parameters: { mode: 'runOnceForEachItem', jsCode: 'return { json: { output: $(\'Extraire Réponse Finale\').item.json.answerText } };' }, position: [2176, 544], notes: 'Format attendu par le Chat Trigger en mode "lastNode" : { output: \'<texte affiché dans le chat>\' }. BUG CORRIGÉ : lisait $json.answerText, mais $json ici vient de "Sauvegarder Échange" (nœud Postgres juste avant), qui ne renvoie pas ce champ (INSERT sans RETURNING) — output était donc toujours undefined, d\'où "<Empty response>" dans le chat malgré une exécution 100% réussie sur tous les nœuds. Référence explicite au nœud "Extraire Réponse Finale" qui porte réellement answerText.', notesInFlow: true }
});

const wf = workflow('', 'RAG Mental Health', { executionOrder: 'v1', description: 'Pipeline RAG hybride (recherche vecteur + mots-clés, reranking RRF) sur un corpus santé mentale. Basé sur RAG Livre, avec le bug "<Empty response>" corrigé : "Préparer Réponse Finale" référence désormais explicitement "Extraire Réponse Finale" au lieu de $json (qui venait du nœud Postgres "Sauvegarder Échange" et ne portait pas answerText).' });

export default wf
  .add(upload_Livre_PDF)
  .to(extraire_Texte_PDF)
  .to(nettoyer_Et_Structurer)
  .to(chunking_Avanc)
  .to(s_parer_Chunks)
  .to(limiter_Chunks)
  .to(extraire_Mots_Cl_s)
  .to(appeler_Embedding_Gemini)
  .to(pr_parer_Insertion_Hybride)
  .to(ins_rer_Document_Hybride)
  .add(recevoir_Message)
  .to(r_cup_rer_Contexte)
  .to(agr_ger_Historique)
  .to(router_La_Requ_te)
  .to(extraire_Requ_te_Reformul_e
  .to([
    rechercher_Vecteurs
    .to(tagger_R_sultats_Vecteurs),
    rechercher_Mots_Cl_s
    .to(tagger_R_sultats_Mots_Cl_s)]))
  .add(tagger_R_sultats_Vecteurs.to(fusionner_R_sultats.input(0)))
  .add(tagger_R_sultats_Mots_Cl_s.to(fusionner_R_sultats.input(1)))
  .add(fusionner_R_sultats)
  .to(reranking_RRF
  .to(formater_Contexte_Documentaire)
  .to(g_n_rer_R_ponse)
  .to(extraire_R_ponse_Finale)
  .to(sauvegarder_change)
  .to(pr_parer_R_ponse_Finale))
