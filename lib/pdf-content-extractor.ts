import * as pdfjsLib from "pdfjs-dist";

export const extractDocumentContent = async (file: File): Promise<string[]> => {
  let content: string[] = [];

  const fileData = await file.arrayBuffer();
  const pdf = pdfjsLib.getDocument(fileData);
  const doc = await pdf.promise.then((doc) => {
    return doc;
  });

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const text = await page.getTextContent();
    const pageContent = text.items.map((item) => {
      // @ts-ignore
      return item.str;
    });
    content.push(pageContent.join(" "));
  }
  return content;
};
