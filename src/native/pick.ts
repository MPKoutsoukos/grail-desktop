// Pick image files from disk (multiple by default), as data URLs ready to save.

export interface ScreenshotRef {
  key: string   // stable id for de-dup within a batch
  src: string   // data URL
  ts: number    // the file's modified time (ms)
  name: string
}

export function pickImages(multiple = true): Promise<ScreenshotRef[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = multiple
    input.onchange = async () => resolve(await Promise.all(Array.from(input.files ?? []).map(fileToRef)))
    input.addEventListener('cancel', () => resolve([]))
    input.click()
  })
}

function fileToRef(file: File): Promise<ScreenshotRef> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ key: `${file.name}:${file.lastModified}`, src: reader.result as string, ts: file.lastModified, name: file.name })
    reader.readAsDataURL(file)
  })
}
