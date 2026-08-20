import { buildReleaseNotes } from './release-notes'

const [tag] = process.argv.slice(2)

if (!tag) {
  console.error('Usage: tsx scripts/release-notes-run.ts <name>@<version>')
  process.exit(1)
}

try {
  console.log(buildReleaseNotes(tag))
} catch (error) {
  console.error(error)
  process.exit(1)
}
