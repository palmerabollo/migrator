const path = require('path');
const migrate = require('migrate');

// options already support a sortFunction. It could be useful but is not applied when migrations are added dynamically
const optionsMigrate = {
  stateStore: path.join(__dirname, '.migrate'),
  migrationsDirectory: path.join(__dirname, 'migrations')  // empty, migrations will be added later on
};

migrate.load(optionsMigrate, (err, set) => {
  const migrations = [
    {
      "id": "one",
      "version": "4.1.0",
      "up": "docker-image-up-one",
      "down": "docker-image-down-one"
    },
    {
      "id": "two",
      "version": "4.2.0",
      "up": "docker-image-up-two",
      "down": "docker-image-down-two"
    },
    {
      "id": "three",
      "version": "4.3.0",
      "up": "docker-image-up-three",
      "down": "docker-image-down-three"
    }
  ];

  migrations.forEach(migration => {
    set.addMigration(
      migration.version + "-" + migration.id, // title defines the execution order
      function up() {
        console.log(`MIGRATION UP ${migration.id} [docker image ${migration.up}]`);
        return Promise.resolve();
      },
      function down() {
        console.log(`MIGRATION DOWN ${migration.id} [docker image ${migration.down}]`);
        return Promise.resolve();
      },
    );
  });


  set.up("2-migration", () => {
    console.log("DONE UP TO 2");
    set.down("1-migration", () => {
      console.log("DONE DOWN TO 1");
    })
  });
});

export {};
