const d_clencheur_Erreur = trigger({
  type: 'n8n-nodes-base.errorTrigger',
  version: 1,
  config: { name: 'Déclencheur Erreur', notes: 'Se déclenche quand WF1 (Radar) ou WF2 (Envoi) échoue après ses 3 tentatives de Retry On Fail, une fois ce workflow défini comme leur error workflow dans les réglages de chacun.', notesInFlow: true }
});

const envoyer_Alerte_Email = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: { name: 'Envoyer Alerte Email', parameters: { resource: 'message', operation: 'send', sendTo: 'romane13.long@gmail.com', subject: expr('⚠️ Erreur : {{ $json.workflow.name }}'), emailType: 'html', message: expr('<p>Le workflow <strong>{{ $json.workflow.name }}</strong> a échoué.</p><p><strong>Message d\'erreur :</strong> {{ $json.execution.error.message }}</p><p><a href="{{ $json.execution.url }}">Voir l\'exécution dans n8n</a></p>'), options: {} }, credentials: { gmailOAuth2: newCredential('Gmail (OAuth2)', 'REMPLACER_ID_CREDENTIAL_GMAIL') }, position: [220, 0], notes: 'Envoie le récapitulatif de l\'erreur à Romane. La credential Gmail (OAuth2) est un placeholder : n8n demandera de la sélectionner à l\'import.', notesInFlow: true }
});

const wf = workflow('wf3-alerte-erreur', 'WF3 Alerte Erreur', { description: 'Error workflow partagé par WF1 (Radar) et WF2 (Envoi) : reçoit les échecs non résolus après leurs tentatives de Retry On Fail et envoie un mail récapitulatif.', availableInMCP: true, executionOrder: 'v1' });

export default wf
  .add(d_clencheur_Erreur)
  .to(envoyer_Alerte_Email)