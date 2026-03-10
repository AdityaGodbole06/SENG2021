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

module.exports = { generateReceiptAdviceXML };
