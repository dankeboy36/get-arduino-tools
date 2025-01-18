import esbuild from 'esbuild'

esbuild
  .build({
    entryPoints: ['src/index.js', 'src/cli.js'],
    bundle: true,
    outdir: 'dist',
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    sourcemap: true,
    minify: true,
  })
  .then(
    () => console.log('Build OK'),
    (err) => {
      console.error(err)
      process.exit(1)
    }
  )
