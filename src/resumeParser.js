import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ACCEPTED_EXTENSIONS = /\.(pdf|docx)$/i;

export function isResumeFile(file) {
  if (!file) return false;
  if (ACCEPTED_TYPES.has(file.type)) return true;
  return ACCEPTED_EXTENSIONS.test(file.name || "");
}

export async function parseResumeFile(file) {
  if (!isResumeFile(file)) {
    throw new Error("仅支持 .docx 或 .pdf 格式的简历文件");
  }

  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".docx")) {
    return parseDocx(file);
  }
  if (lowerName.endsWith(".pdf")) {
    return parsePdf(file);
  }

  throw new Error("无法识别文件格式，请上传 .docx 或 .pdf");
}

async function parseDocx(file) {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = result.value?.trim();
  if (!text) throw new Error("未能从 Word 文档中读取到文本内容");
  return text;
}

async function parsePdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    if (pageText) pages.push(pageText);
  }

  const text = pages.join("\n").trim();
  if (!text) throw new Error("未能从 PDF 中读取到文本内容");
  return text;
}
