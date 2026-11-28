import "server-only"
import path from "node:path"
import { Font } from "@react-pdf/renderer"

/*
 * PDFs embed Noto Sans (Latin, Greek, Cyrillic and currency signs such as ₹)
 * with Noto Sans Devanagari as a fallback, so names and amounts in any of
 * these scripts print correctly. The fonts ship in assets/fonts under the
 * SIL Open Font License.
 */
const directory = path.join(process.cwd(), "assets", "fonts")

Font.register({
  family: "Noto Sans",
  fonts: [
    { src: path.join(directory, "NotoSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(directory, "NotoSans-Bold.ttf"), fontWeight: 700 },
  ],
})

Font.register({
  family: "Noto Sans Devanagari",
  fonts: [
    { src: path.join(directory, "NotoSansDevanagari-Regular.ttf"), fontWeight: 400 },
    { src: path.join(directory, "NotoSansDevanagari-Bold.ttf"), fontWeight: 700 },
  ],
})

Font.registerHyphenationCallback((word) => [word])

export const PDF_FONT = ["Noto Sans", "Noto Sans Devanagari"]
