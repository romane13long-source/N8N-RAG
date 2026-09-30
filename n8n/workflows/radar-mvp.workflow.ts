const google_Gemini_Chat_Model = languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1.1, config: { name: 'Google Gemini Chat Model', parameters: { modelName: 'models/gemini-3.1-flash-lite', options: {} }, credentials: { googlePalmApi: newCredential('Google Gemini API Key', 'REMPLACER_ID_CREDENTIAL_GEMINI') }, position: [1440, 520] } });
const structured_Output_Parser = outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { name: 'Structured Output Parser', parameters: { schemaType: 'fromJson', jsonSchemaExample: '{\n  "score": 82,\n  "raison": "Poste de Data Scientist correspondant au profil débutant recherché, stack cohérente avec l\'expérience de Romane."\n}' }, position: [1680, 520] } });

const d_clencheur_Manuel = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Déclencheur Manuel', position: [0, 300] }
});

const r_cup_rer_Offres_Adzuna = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: { name: 'Récupérer Offres Adzuna', parameters: { method: 'GET', url: 'https://api.adzuna.com/v1/api/jobs/fr/search/1', sendQuery: true, queryParameters: { parameters: [{ name: 'app_id', value: 'REMPLACER_APP_ID_ADZUNA' }, { name: 'app_key', value: 'REMPLACER_APP_KEY_ADZUNA' }, { name: 'results_per_page', value: '20' }, { name: 'what', value: 'data scientist' }] }, options: {} }, position: [260, 300], notes: 'Remplacer REMPLACER_APP_ID_ADZUNA et REMPLACER_APP_KEY_ADZUNA par vos identifiants developer.adzuna.com.', notesInFlow: true }
});

const extraire_R_sultats = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: { name: 'Extraire Résultats', parameters: { fieldToSplitOut: 'results', options: {} }, position: [520, 300] }
});

const normaliser_Offre = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: { name: 'Normaliser Offre', parameters: { mode: 'manual', assignments: { assignments: [{ id: 'f1', name: 'offre_id', value: expr('adzuna_{{ $json.id }}'), type: 'string' }, { id: 'f2', name: 'titre', value: expr('{{ $json.title }}'), type: 'string' }, { id: 'f3', name: 'entreprise', value: expr('{{ $json.company.display_name }}'), type: 'string' }, { id: 'f4', name: 'lieu', value: expr('{{ $json.location.display_name }}'), type: 'string' }, { id: 'f5', name: 'pays', value: 'France', type: 'string' }, { id: 'f6', name: 'url', value: expr('{{ $json.redirect_url }}'), type: 'string' }, { id: 'f7', name: 'description', value: expr('{{ $json.description }}'), type: 'string' }, { id: 'f8', name: 'date_detection', value: expr('{{ $now.toISO() }}'), type: 'string' }, { id: 'f9', name: 'source', value: 'adzuna', type: 'string' }] }, includeOtherFields: false, options: {} }, position: [780, 300] }
});

const filtrer_Crit_res = node({
  type: 'n8n-nodes-base.filter',
  version: 2.3,
  config: { name: 'Filtrer Critères', parameters: { conditions: { combinator: 'and', options: { caseSensitive: false, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'c1', leftValue: expr('{{ $json.titre }}'), rightValue: 'senior', operator: { type: 'string', operation: 'notContains' } }, { id: 'c2', leftValue: expr('{{ $json.titre }}'), rightValue: 'lead', operator: { type: 'string', operation: 'notContains' } }, { id: 'c3', leftValue: expr('{{ $json.titre }}'), rightValue: 'stage', operator: { type: 'string', operation: 'notContains' } }, { id: 'c4', leftValue: expr('{{ $json.titre }}'), rightValue: 'stagiaire', operator: { type: 'string', operation: 'notContains' } }, { id: 'c5', leftValue: expr('{{ $json.titre }}'), rightValue: 'alternance', operator: { type: 'string', operation: 'notContains' } }] }, looseTypeValidation: false, options: {} }, position: [1040, 300] }
});

const limiter_Volume = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: { name: 'Limiter Volume', parameters: { maxItems: 15, keep: 'firstItems' }, position: [1300, 300] }
});

const scorer_Offre = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: { name: 'Scorer Offre', parameters: { promptType: 'define', text: expr('Tu évalues des offres d\'emploi pour Romane, qui candidate à des postes de Data Scientist ou ML Engineer en CDI/CDD/VIE, avec 0 à 2 ans d\'expérience, disponible immédiatement.\n\nOffre à évaluer :\nTitre : {{ $json.titre }}\nEntreprise : {{ $json.entreprise }}\nLieu : {{ $json.lieu }}\nDescription : {{ $json.description }}\n\nDonne un score de 0 à 100 selon la pertinence de cette offre pour ce profil (poste Data Scientist ou ML Engineer, niveau débutant à 2 ans d\'expérience, jamais senior ni lead), et une raison courte (1 à 2 phrases) qui justifie ce score.'), hasOutputParser: true }, position: [1560, 300], subnodes: { model: google_Gemini_Chat_Model, outputParser: structured_Output_Parser } }
});

const enregistrer_Sheet = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.7,
  config: { name: 'Enregistrer Sheet', parameters: { resource: 'sheet', operation: 'appendOrUpdate', documentId: { __rl: true, mode: 'list', value: '', cachedResultName: 'Candidatures' }, sheetName: { __rl: true, mode: 'list', value: '', cachedResultName: 'Candidatures' }, columns: { mappingMode: 'defineBelow', matchingColumns: ['offre_id'], value: { offre_id: expr('{{ $json.offre_id }}'), source: expr('{{ $json.source }}'), date_detection: expr('{{ $json.date_detection }}'), titre: expr('{{ $json.titre }}'), entreprise: expr('{{ $json.entreprise }}'), pays: expr('{{ $json.pays }}'), lieu: expr('{{ $json.lieu }}'), url: expr('{{ $json.url }}'), score: expr('{{ $json.output.score }}'), raison: expr('{{ $json.output.raison }}'), statut: 'À valider' }, schema: [{ id: 'offre_id', displayName: 'offre_id', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'source', displayName: 'source', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'date_detection', displayName: 'date_detection', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'titre', displayName: 'titre', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'entreprise', displayName: 'entreprise', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'pays', displayName: 'pays', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'lieu', displayName: 'lieu', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'url', displayName: 'url', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'score', displayName: 'score', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'raison', displayName: 'raison', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }, { id: 'statut', displayName: 'statut', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: false }] }, options: {} }, credentials: { googleSheetsOAuth2Api: newCredential('Google Sheets account', 'REMPLACER_ID_CREDENTIAL_GOOGLE_SHEETS') }, position: [1820, 300], notes: 'Sélectionner votre credential Google Sheets réelle, puis choisir le document et l\'onglet Candidatures dans les pickers (documentId/sheetName sont volontairement vides).', notesInFlow: true }
});

const wf = workflow('', 'Radar MVP', { executionOrder: 'v1' });

export default wf
  .add(d_clencheur_Manuel)
  .to(r_cup_rer_Offres_Adzuna)
  .to(extraire_R_sultats)
  .to(normaliser_Offre)
  .to(filtrer_Crit_res)
  .to(limiter_Volume)
  .to(scorer_Offre)
  .to(enregistrer_Sheet)