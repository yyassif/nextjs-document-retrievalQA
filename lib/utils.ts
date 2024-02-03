export function convertToAscii(inputString: string) {
  const asciiString = inputString.replace(/[^\x00-\x7F]+/g, "");
  return asciiString;
}

async function streamToBlob(stream: ReadableStream<Uint8Array>): Promise<Blob> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }
  return new Blob(chunks, { type: "application/octet-stream" });
}

export async function streamToFile(
  stream: ReadableStream<Uint8Array>,
  fileName: string,
  fileType: string
): Promise<File> {
  const blob = await streamToBlob(stream);
  return new File([blob], fileName, { type: fileType });
}
