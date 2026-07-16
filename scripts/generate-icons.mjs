// Gera apple-icon.png e opengraph-image.png em src/app/ a partir do ícone
// oficial (público/icon-grande.svg — a versão detalhada com gradiente e
// sombra, mesmo desenho do splash em Splash.tsx). public/icon.svg é só a
// versão achatada usada no favicon e reduzida dentro da página.
// Rodar de novo se o logo mudar: node scripts/generate-icons.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconSvg = readFileSync(path.join(root, "public/icon-grande.svg"));

const BG_TEMA = "#edf0f6"; // --bg claro / viewport.themeColor (src/app/layout.tsx)

async function gerarAppleIcon() {
  // apple-touch-icon: iOS aplica sua própria máscara arredondada, então o
  // ícone (que já vem com cantos e fundo próprios) preenche o quadro inteiro.
  await sharp(iconSvg)
    .resize(180, 180)
    .flatten({ background: BG_TEMA })
    .png()
    .toFile(path.join(root, "src/app/apple-icon.png"));
  console.log("src/app/apple-icon.png (180×180)");
}

async function gerarOgImage() {
  const TAMANHO = 1024;
  const ESCALA_LOGO = 0.72; // margem confortável ao redor do ícone
  const ladoLogo = Math.round(TAMANHO * ESCALA_LOGO);

  const logo = await sharp(iconSvg).resize(ladoLogo, ladoLogo).png().toBuffer();

  await sharp({
    create: {
      width: TAMANHO,
      height: TAMANHO,
      channels: 3,
      background: BG_TEMA,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .removeAlpha() // sem transparência no OG image — flatten() sozinho não bastou
    .png()
    .toFile(path.join(root, "src/app/opengraph-image.png"));
  console.log("src/app/opengraph-image.png (1024×1024)");
}

await gerarAppleIcon();
await gerarOgImage();
