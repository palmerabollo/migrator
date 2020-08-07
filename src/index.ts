const { promisify } = require('util');
const path = require('path')

const bodyParser = require('body-parser');
const express = require('express');
const logger = require('logops');
const migrate = require('migrate');
const slugify = require('slugify');

logger.setLevel('DEBUG');

// see postgres-based example at https://github.com/tj/node-migrate/blob/master/examples/custom-state-storage/custom-state-storage.js
const customStateStorage = {
  load: async (callback) => {
    console.log("load state");
    const set = {}; // lastRun, migrations
    callback(null, set);
  },

  save: async function (set, callback) {
    console.log("save state " + JSON.stringify(set));
    callback();
  }
};

const optionsMigrate = {
  stateStore: customStateStorage,
  migrationsDirectory: path.join(__dirname, 'migrations')  // empty, migrations will be added later on
};

const app = express();
app.use(bodyParser.json())

async function main() {
  const set = await promisify(migrate.load)(optionsMigrate);
  ['up', 'down', 'save'].forEach(f => set[f] = promisify(set[f]));  // to be able to use async/await

  set.on('save', () => {
    logger.debug("saving state");
  })

  set.on('migration', (migration, direction) => {
    logger.debug(`Applied migration ${migration.title} ${direction}`);
  })

  set.on('warning', (message) => {
    logger.warn(message);
  })

  app.get('/migrations', (req, res) => {
    res.json({
      migrations: set.migrations,
      lastRun: set.lastRun
    });
  });

  app.post('/migrations', async (req, res) => {
    const migration = req.body;
    const title = migration.id + "-" + slugify(migration.title, { lower: true });

    set.addMigration(
      title,
      function up() {
        console.log("MIGRATION UP " + migration.up);
        return Promise.resolve();
      },
      function down() {
        console.log("MIGRATION DOWN " + migration.down);
        return Promise.resolve();
      },
    );

    await set.save();

    res.status(200).send();
  });

  app.post('/migrations/:id/up', async (req, res) => {
    try {
      logger.info(`Migrate UP to ${req.params.id}`);
      await set.up(req.params.id);
      res.status(200).send();
    } catch (e) {
      // XXX move this generic try/catch block to an error middleware
      logger.error(e);
      res.status(500).send();
    }
  });

  app.post('/migrations/:id/down', async (req, res) => {
    try {
      logger.info(`Migrate DOWN to ${req.params.id}`);
      await set.down(req.params.id);
      res.status(200).send();
    } catch (e) {
      // XXX move this generic try/catch block to an error middleware
      logger.error(e);
      res.status(500).send();
    }
  });

  const port = process.env.PORT || 3000;
  const server = app.listen(port, '0.0.0.0', async (e) => {
    logger.debug(`Migrator listening at http://localhost:${port}`);
  });
  server.setTimeout(5000);
}

main().catch(e => logger.error(e));
