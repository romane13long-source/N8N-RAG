const notation_offre = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.1, config: { name: 'notation offre', parameters: { modelName: 'models/gemini-3.1-flash-lite', options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini(PaLM) Api account', 'oewWUKLTw4zHgfP9') }, position: [1576, 536] } });
const r_ponse_structur = outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { name: 'réponse structuré', parameters: { jsonSchemaExample: '{\n  "score": 78,\n  "raison": "Poste Data Scientist VIE correspondant au profil recherché."\n}' }, position: [1704, 536] } });

const d_clencheur_Manuel = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Déclencheur Manuel', position: [0, 304] }
});

const r_cup_rer_Offres_VIE = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'Récupérer Offres VIE', parameters: { method: 'POST', url: 'https://civiweb-api-prd.azurewebsites.net/api/Offers/search', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth', sendHeaders: true, headerParameters: { parameters: [{ name: 'Accept', value: '*/*' }, { name: 'Accept-Language', value: 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7' }, { name: 'Connection', value: 'keep-alive' }, { name: 'Origin', value: 'https://mon-vie-via.businessfrance.fr' }, { name: 'Referer', value: 'https://mon-vie-via.businessfrance.fr/' }, { name: 'Sec-Fetch-Dest', value: 'empty' }, { name: 'Sec-Fetch-Mode', value: 'cors' }, { name: 'Sec-Fetch-Site', value: 'cross-site' }, { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36' }, { name: 'sec-ch-ua', value: '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"' }, { name: 'sec-ch-ua-mobile', value: '?0' }, { name: 'sec-ch-ua-platform', value: '"macOS"' }] }, sendBody: true, specifyBody: 'json', jsonBody: '{\n  "limit": 100,\n  "skip": 0,\n  "query": null,\n  "activitySectorId": [],\n  "missionsTypesIds": [],\n  "missionsDurations": [],\n  "geographicZones": [],\n  "countriesIds": [],\n  "studiesLevelId": [],\n  "companiesSizes": [],\n  "specializationsIds": [],\n  "entreprisesIds": [],\n  "missionStartDate": null\n}', options: {} }, credentials: { httpTemplatedCustomAuth: newCredential('Business France VIE API (romane)', 'ao7jWkSPLMBkwoLW') }, position: [224, 304], notesInFlow: true }
});

const extraire_Offres = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: { name: 'Extraire Offres', parameters: { jsCode: '// Cette API n\'est pas documentée : sa réponse peut être un tableau brut,\n// ou un objet { result / results / data / offers / items: [...] }.\n// On gère les deux cas, comme le fait le projet de référence vérifié.\nconst bodies = $input.all().map(i => i.json);\nlet offers = [];\n\nif (bodies.length !== 1) {\n  // n8n a peut-être déjà séparé un tableau JSON en plusieurs items\n  offers = bodies;\n} else {\n  const body = bodies[0];\n  if (Array.isArray(body)) {\n    offers = body;\n  } else if (body && typeof body === \'object\') {\n    for (const key of [\'result\', \'results\', \'data\', \'offers\', \'items\']) {\n      if (Array.isArray(body[key])) { offers = body[key]; break; }\n    }\n  }\n}\n\nreturn offers.map(o => ({ json: o }));' }, position: [448, 304], notes: 'Normalise la forme de la réponse (tableau brut ou objet enveloppé) car l\'API n\'est pas documentée. Nœud Code justifié ici : aucun nœud natif ne gère ce cas de figure incertain.', notesInFlow: true }
});

const normaliser_Offre = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: { name: 'Normaliser Offre', parameters: { assignments: { assignments: [{ id: 'f1', name: 'offre_id', value: expr('{{ \'vie_\' + ($json.id || $json.offerId || $json.Id || $json.ID) }}'), type: 'string' }, { id: 'f2', name: 'titre', value: expr('{{ $json.missionTitle || $json.title || $json.mission || $json.label || $json.name || \'\' }}'), type: 'string' }, { id: 'f3', name: 'entreprise', value: expr('{{ $json.organizationName || $json.companyName || $json.company || $json.entreprise || $json.organisation || \'\' }}'), type: 'string' }, { id: 'f4', name: 'lieu', value: expr('{{ $json.cityName || $json.city || $json.ville || \'\' }}'), type: 'string' }, { id: 'f5', name: 'pays', value: expr('{{ $json.countryName || $json.country || $json.pays || \'\' }}'), type: 'string' }, { id: 'f6', name: 'contrat', value: 'VIE', type: 'string' }, { id: 'f7', name: 'url', value: expr('{{ \'https://mon-vie-via.businessfrance.fr/offres/\' + ($json.id || $json.offerId || $json.Id || $json.ID) }}'), type: 'string' }, { id: 'f8', name: 'description', value: expr('{{ $json.missionDescription || $json.description || $json.summary || $json.missionDetails || \'\' }}'), type: 'string' }, { id: 'f9', name: 'date_detection', value: expr('{{ $now.toISO() }}'), type: 'string' }, { id: 'f10', name: 'source', value: 'vie_businessfrance', type: 'string' }] }, options: {} }, position: [672, 304], notes: 'titre/entreprise/lieu/pays/offre_id/url : noms de champs vérifiés sur un projet tiers utilisant cette même API. description : HYPOTHÈSE non vérifiée, à corriger après le premier test si besoin.', notesInFlow: true }
});

const filtrer_Mots_Cl_s1 = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: { name: 'Filtrer Mots-Clés1', parameters: { conditions: { combinator: 'or', options: { caseSensitive: false, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'k1', leftValue: expr('{{ $json.titre }}'), rightValue: 'data', operator: { type: 'string', operation: 'contains' } }, { id: 'k2', leftValue: expr('{{ $json.titre }}'), rightValue: 'analytics', operator: { type: 'string', operation: 'contains' } }, { id: 'k3', leftValue: expr('{{ $json.titre }}'), rightValue: 'analyste', operator: { type: 'string', operation: 'contains' } }, { id: 'k4', leftValue: expr('{{ $json.titre }}'), rightValue: 'intelligence artificielle', operator: { type: 'string', operation: 'contains' } }, { id: 'k5', leftValue: expr('{{ $json.titre }}'), rightValue: 'machine learning', operator: { type: 'string', operation: 'contains' } }, { id: 'k6', leftValue: expr('{{ $json.titre }}'), rightValue: 'python', operator: { type: 'string', operation: 'contains' } }, { id: 'k7', leftValue: expr('{{ $json.titre }}'), rightValue: 'business intelligence', operator: { type: 'string', operation: 'contains' } }, { id: 'k8', leftValue: expr('{{ $json.titre }}'), rightValue: 'décisionnel', operator: { type: 'string', operation: 'contains' } }, { id: 'k9', leftValue: expr('{{ $json.titre }}'), rightValue: 'big data', operator: { type: 'string', operation: 'contains' } }, { id: 'k10', leftValue: expr('{{ $json.titre }}'), rightValue: 'ia ', operator: { type: 'string', operation: 'contains' } }, { id: 'k11', leftValue: expr('{{ $json.titre }}'), rightValue: 'digital', operator: { type: 'string', operation: 'contains' } }, { id: 'k12', leftValue: expr('{{ $json.titre }}'), rightValue: 'sql', operator: { type: 'string', operation: 'contains' } }] }, options: {} }, position: [896, 304] }
});

const filtrer_Exclusions = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: { name: 'Filtrer Exclusions', parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ id: 'e1', leftValue: expr('{{ $json.titre }}'), rightValue: 'senior', operator: { type: 'string', operation: 'notContains' } }, { id: 'e2', leftValue: expr('{{ $json.titre }}'), rightValue: 'lead', operator: { type: 'string', operation: 'notContains' } }], combinator: 'and' }, options: {} }, position: [1120, 304] }
});

const limiter_Volume = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limiter Volume', parameters: { maxItems: 15 }, position: [1344, 304] }
});

const scorer_Offre = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Scorer Offre', parameters: { promptType: 'define', text: expr('Tu évalues des offres VIE pour Romane, qui cherche un poste de Data Scientist ou ML Engineer, disponible immédiatement.\n\nOffre à évaluer :\nTitre : {{ $json.titre }}\nEntreprise : {{ $json.entreprise }}\nPays : {{ $json.pays }}\nLieu : {{ $json.lieu }}\nDescription : {{ $json.description }}\n\n(La description peut être vide, ce n\'est pas anormal : base ton évaluation sur le titre et l\'entreprise si besoin.)\n\nDonne un score de 0 à 100 selon la pertinence de cette offre pour un profil Data Scientist / ML Engineer débutant, et une raison courte (1 à 2 phrases) qui justifie ce score.'), hasOutputParser: true, batching: {} }, position: [1568, 304], subnodes: { model: notation_offre, outputParser: r_ponse_structur } }
});

const enregistrer_Sheet = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Enregistrer Sheet', parameters: { operation: 'appendOrUpdate', documentId: { __rl: true, value: '14alHhyG6OOMt7Ya8GjSW9_Ld0GRHU03LkH2zcgOvnzA', mode: 'list', cachedResultName: 'Candidatures - Radar VIE', cachedResultUrl: 'https://docs.google.com/spreadsheets/d/14alHhyG6OOMt7Ya8GjSW9_Ld0GRHU03LkH2zcgOvnzA/edit?usp=drivesdk' }, sheetName: { __rl: true, value: 592117535, mode: 'list', cachedResultName: 'Untitled', cachedResultUrl: 'https://docs.google.com/spreadsheets/d/14alHhyG6OOMt7Ya8GjSW9_Ld0GRHU03LkH2zcgOvnzA/edit#gid=592117535' }, columns: { mappingMode: 'defineBelow', matchingColumns: ['offre_id'], value: { offre_id: expr('{{ $(\'Limiter Volume\').item.json.offre_id }}'), source: expr('{{ $(\'Limiter Volume\').item.json.source }}'), date_detection: expr('{{ $(\'Limiter Volume\').item.json.date_detection }}'), titre: expr('{{ $(\'Limiter Volume\').item.json.titre }}'), entreprise: expr('{{ $(\'Limiter Volume\').item.json.entreprise }}'), pays: expr('{{ $(\'Limiter Volume\').item.json.pays }}'), lieu: expr('{{ $(\'Limiter Volume\').item.json.lieu }}'), contrat: expr('{{ $(\'Limiter Volume\').item.json.contrat }}'), url: expr('{{ $(\'Limiter Volume\').item.json.url }}'), score: expr('{{ $json.output.score }}'), raison: expr('{{ $json.output.raison }}'), statut: 'À valider' }, schema: [{ id: 'offre_id', displayName: 'offre_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'source', displayName: 'source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'date_detection', displayName: 'date_detection', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'titre', displayName: 'titre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'entreprise', displayName: 'entreprise', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'pays', displayName: 'pays', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'lieu', displayName: 'lieu', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'contrat', displayName: 'contrat', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'url', displayName: 'url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'email_candidature', displayName: 'email_candidature', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'mode_candidature', displayName: 'mode_candidature', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'langue', displayName: 'langue', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'score', displayName: 'score', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'raison', displayName: 'raison', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'cv_pdf_url', displayName: 'cv_pdf_url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'lettre_pdf_url', displayName: 'lettre_pdf_url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'statut', displayName: 'statut', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'date_envoi', displayName: 'date_envoi', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'notes', displayName: 'notes', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }], attemptToConvertTypes: false, convertFieldsToString: false }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account', 'fiPBhM64kS7uToSM') }, position: [1920, 304], notes: 'Mapping complet : offre_id comme clé de dédup, score/raison viennent de la sortie de Scorer Offre.', notesInFlow: true }
});

const wf = workflow('', 'Radar VIE MVP');

export default wf
  .add(d_clencheur_Manuel)
  .to(r_cup_rer_Offres_VIE)
  .to(extraire_Offres)
  .to(normaliser_Offre)
  .to(filtrer_Mots_Cl_s1)
  .to(filtrer_Exclusions)
  .to(limiter_Volume)
  .to(scorer_Offre)
  .to(enregistrer_Sheet)