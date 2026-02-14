module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: ['> 1%', 'last 2 versions', 'not dead'],
      modules: false
    }]
  ],
  env: {
    test: {
      presets: [
        ['@babel/preset-env', {
          targets: { node: 'current' }
        }]
      ]
    }
  }
};
