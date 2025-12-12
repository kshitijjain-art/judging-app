const knexConfig = require('./knexfile');
const env = process.env.NODE_ENV || 'development';
const knex = require('knex')(knexConfig[env]);

(async () => {
  try {
    // create tables if not exist
    await knex.schema.hasTable('events').then(async (exists) => {
      if (!exists) {
        await knex.schema.createTable('events', t => { t.increments('id'); t.string('name'); t.string('date'); });
      }
    });

    await knex.schema.hasTable('teams').then(async (exists) => {
      if (!exists) {
        await knex.schema.createTable('teams', t => { t.increments('id'); t.integer('event_id'); t.string('name'); t.string('members'); });
      }
    });

    await knex.schema.hasTable('criteria').then(async (exists) => {
      if (!exists) {
        await knex.schema.createTable('criteria', t => { t.increments('id'); t.integer('event_id'); t.string('name'); t.integer('max_score'); });
      }
    });

    await knex.schema.hasTable('judges').then(async (exists) => {
      if (!exists) {
        await knex.schema.createTable('judges', t => { t.increments('id'); t.string('name'); t.string('email'); });
      }
    });

    await knex.schema.hasTable('scores').then(async (exists) => {
      if (!exists) {
        await knex.schema.createTable('scores', t => { t.increments('id'); t.integer('event_id'); t.integer('team_id'); t.string('judge_name'); t.float('total_score'); t.text('remark'); t.string('submitted_at'); });
      }
    });

    await knex.schema.hasTable('scoredetails').then(async (exists) => {
      if (!exists) {
        await knex.schema.createTable('scoredetails', t => { t.increments('id'); t.integer('score_id'); t.integer('criterion_id'); t.float('score'); });
      }
    });

    // seed sample event if none exist
    const ev = await knex('events').count('id as c').first();
    if (ev && Number(ev.c) === 0) {
      const inserted = await knex('events').insert({ name: 'Shivalik SharkLab Innovators 1.0', date: '2025-12-20' });
      const finalEventId = Array.isArray(inserted) ? inserted[0] : inserted;

      await knex('teams').insert([{ event_id: finalEventId, name: 'Team Alpha', members: 'Alice, Bob' }, { event_id: finalEventId, name: 'Team Beta', members: 'Charlie, Deepa' }]);

      await knex('criteria').insert([
        { event_id: finalEventId, name: 'Presentation Skills', max_score: 10 },
        { event_id: finalEventId, name: 'Idea', max_score: 10 },
        { event_id: finalEventId, name: 'Uniqueness', max_score: 10 },
        { event_id: finalEventId, name: 'Methodology', max_score: 10 }
      ]);

      await knex('judges').insert([
        { name: 'Prof. Kshitij Jain', email: 'kshitij.jain@shivalikcollege.edu.in' },
        { name: 'Dr. Ajay Verma', email: 'ajay.verma@shivalikcollege.edu.in' },
        { name: 'Prof. Rahul Sharma', email: 'rahul.sharma@shivalikcollege.edu.in' }
      ]);

      console.log('Seeded sample event, teams, criteria, judges.');
    } else {
      console.log('DB already initialized.');
    }

    console.log('init_db complete.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
