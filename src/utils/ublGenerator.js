const { create } = require('xmlbuilder2');

//  Receipt advice data --> UBL 2.1 XML string
const generateReceiptAdviceXML = (data) => {
  const { receiptAdviceId, dispatchAdviceId, receiptDate, receivedItems, notes } = data;

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('ReceiptAdvice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:ReceiptAdvice-2',
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    })
      .ele('cbc:UBLVersionID').txt('2.1').up()
      .ele('cbc:ID').txt(receiptAdviceId).up()
      .ele('cbc:IssueDate').txt(formatDate(receiptDate)).up();

  if (notes) {
    doc.ele('cbc:Note').txt(notes).up();
  }

  // Reference to the originating Despatch Advice
  doc
    .ele('cac:DespatchDocumentReference')
      .ele('cbc:ID').txt(dispatchAdviceId).up()
    .up();

  // Receipt lines (one per received item)
  receivedItems.forEach((item, index) => {
    doc
      .ele('cac:ReceiptLine')
        .ele('cbc:ID').txt(String(index + 1)).up()
        .ele('cbc:ReceivedQuantity', { unitCode: item.uom }).txt(String(item.quantityReceived)).up()
        .ele('cac:Item')
          .ele('cac:SellersItemIdentification')
            .ele('cbc:ID').txt(item.sku).up()
          .up()
        .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
};

const formatDate = (date) => new Date(date).toISOString().split('T')[0];
// Despatch Advice --> UBL 2.1 XML
const generateDespatchAdviceXML = (data) => {
  const {
    despatchAdviceId,
    externalRef,
    despatchParty,
    deliveryParty,
    dispatchDate,
    expectedDeliveryDate,
    items,
  } = data;

  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('DespatchAdvice', {
      xmlns: 'urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2',
      'xmlns:cac': 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
      'xmlns:cbc': 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    })
      .ele('cbc:UBLVersionID').txt('2.1').up()
      .ele('cbc:ID').txt(despatchAdviceId).up()
      .ele('cbc:IssueDate').txt(formatDate(dispatchDate)).up();

  if (externalRef) {
    doc.ele('cbc:ReferenceID').txt(externalRef).up();
  }

  // Despatch party
  doc
    .ele('cac:DespatchSupplierParty')
      .ele('cac:Party')
        .ele('cbc:ID').txt(despatchParty.partyId).up()
        .ele('cbc:Name').txt(despatchParty.name).up()
      .up()
    .up();

  // Delivery party
  doc
    .ele('cac:DeliveryCustomerParty')
      .ele('cac:Party')
        .ele('cbc:ID').txt(deliveryParty.partyId).up()
        .ele('cbc:Name').txt(deliveryParty.name).up()
      .up()
    .up();

  if (expectedDeliveryDate) {
    doc.ele('cbc:ExpectedDeliveryDate').txt(formatDate(expectedDeliveryDate)).up();
  }

  // Despatch lines
  items.forEach((item, index) => {
    doc
      .ele('cac:DespatchLine')
        .ele('cbc:ID').txt(String(index + 1)).up()
        .ele('cbc:DeliveredQuantity', { unitCode: item.uom }).txt(String(item.quantity)).up()
        .ele('cac:Item')
          .ele('cbc:Description').txt(item.description || '').up()
          .ele('cbc:Name').txt(item.sku).up()
        .up()
      .up();
  });

  return doc.end({ prettyPrint: true });
};
module.exports = { generateReceiptAdviceXML,generateDespatchAdviceXML, };
