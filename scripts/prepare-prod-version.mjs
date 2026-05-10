import fs from 'node:fs'
import path from 'node:path'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const githubSha = process.env.GITHUB_SHA || ''
const githubRunNumber = process.env.GITHUB_RUN_NUMBER || ''

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL nao foi informado.')
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY nao foi informado.')
}

async function reservarVersao() {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/rpc_reservar_versao_aplicacao`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        p_ds_versao: `Deploy GitHub Actions ${githubRunNumber} ${githubSha.slice(0, 7)}`.trim(),
      }),
    },
  )

  const text = await response.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!response.ok) {
    console.error(data)
    throw new Error('Erro ao reservar versao no Supabase.')
  }

  const result = Array.isArray(data) ? data[0] : data

  if (!result?.cd_versao) {
    throw new Error('A RPC nao retornou cd_versao.')
  }

  return result.cd_versao
}

function upsertEnvValue(filePath, key, value) {
  const line = `${key}=${value}`

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, `${line}\n`, 'utf8')
    return
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const regex = new RegExp(`^${key}=.*$`, 'm')
  const nextContent = regex.test(content)
    ? content.replace(regex, line)
    : `${content.trimEnd()}\n${line}\n`

  fs.writeFileSync(filePath, nextContent, 'utf8')
}

const version = await reservarVersao()
const envPath = path.resolve(process.cwd(), '.env.production')

upsertEnvValue(envPath, 'VITE_APP_VERSION', version)

if (process.env.GITHUB_ENV) {
  fs.appendFileSync(process.env.GITHUB_ENV, `VITE_APP_VERSION=${version}\n`)
  fs.appendFileSync(process.env.GITHUB_ENV, `DUOCAL_DEPLOY_VERSION=${version}\n`)
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `app_version=${version}\n`)
}

console.log(`Versao de producao reservada: ${version}`)
