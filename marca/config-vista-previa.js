// ⚠️ PROPUESTAS solo para la VISTA PREVIA. En Shopify esto sale de Ajustes del tema (vacío = apagado).
// Confirmar con Max/Tecnobox antes de activarlo: montos, códigos y plazos tienen que existir de verdad.
window.DesveloConfig = {
  contacto: 'hola@duraznito.cl',
  envio: { meta: 60000, texto: 'envío gratis' },              // pedido tipo del PDF: $55.627 → meta un poco más arriba
  entrega: { corte: 14, enviar: [1, 2], recibir: [2, 6] },     // días hábiles referenciales (logística Tecnobox)
  bienvenida: {
    activa: true, segundos: 10,
    cartas: [
      { grande: '10%', texto: 'en tu primera compra', codigo: 'DURAZNITO10' },
      { grande: '$3.000', texto: 'menos en tu envío', codigo: 'DURAZNITOENVIO' },
      { grande: 'regalo', texto: 'esposas de felpa sobre $40.000', codigo: 'DURAZNITOREGALO' },
    ],
  },
};
