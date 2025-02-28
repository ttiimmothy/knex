'use strict';

const chai = require('chai');
chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

const expect = chai.expect;

const _ = require('lodash');
const sinon = require('sinon');

const { TEST_TIMESTAMP } = require('../../../util/constants');
const {
  isRedshift,
  isPostgreSQL,
  isSQLite,
  isMssql,
  isMysql,
  isOracle,
  isPgBased,
} = require('../../../util/db-helpers');
const {
  getAllDbs,
  getKnexForDb,
} = require('../../util/knex-instance-provider');
const logger = require('../../../integration/logger');
const {
  createUsers,
  createAccounts,
  dropTables,
  createTestTableTwo,
  createDataType,
} = require('../../../util/tableCreatorHelper');
const {
  assertNumber,
  assertJsonEquals,
} = require('../../../util/assertHelper');

describe('Inserts', function () {
  getAllDbs().forEach((db) => {
    describe(db, () => {
      let knex;

      before(async () => {
        knex = logger(getKnexForDb(db));
        await dropTables(knex);
        await createUsers(knex);
        await createAccounts(knex, true);
        await createTestTableTwo(knex);
        await createDataType(knex);
      });

      after(async () => {
        await dropTables(knex);
        return knex.destroy();
      });

      beforeEach(async () => {
        await knex('accounts').truncate();
        await knex('test_table_two').truncate();
      });

      it('should handle simple inserts', async function () {
        await knex('accounts')
          .insert(
            {
              first_name: 'Test',
              last_name: 'User',
              email: 'test1@example.com',
              logins: 1,
              about: 'Lorem ipsum Dolore labore incididunt enim.',
              created_at: TEST_TIMESTAMP,
              updated_at: TEST_TIMESTAMP,
            },
            'id'
          )
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test1@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
              ],
              [1]
            );
            tester(
              'pg',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?) returning "id"',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test1@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }]
            );
            tester(
              'pg-redshift',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test1@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
              ],
              1
            );
            tester(
              'sqlite3',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?) returning `id`',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test1@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
              ],
              [{ id: 1 }]
            );
            tester(
              'oracledb',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?) returning "id" into ?',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test1@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              [{ id: 1 }]
            );
            tester(
              'mssql',
              'insert into [accounts] ([about], [created_at], [email], [first_name], [last_name], [logins], [updated_at]) output inserted.[id] values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test1@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }]
            );
          });
      });

      it('should handle multi inserts', async function () {
        await knex('accounts')
          .insert(
            [
              {
                first_name: 'Test',
                last_name: 'User',
                email: 'test2@example.com',
                logins: 1,
                about: 'Lorem ipsum Dolore labore incididunt enim.',
                created_at: TEST_TIMESTAMP,
                updated_at: TEST_TIMESTAMP,
              },
              {
                first_name: 'Test',
                last_name: 'User',
                email: 'test3@example.com',
                about: 'Lorem ipsum Dolore labore incididunt enim.',
                logins: 2,
                created_at: TEST_TIMESTAMP,
                updated_at: TEST_TIMESTAMP,
              },
            ],
            'id'
          )
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test2@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test3@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [1]
            );
            tester(
              'pg',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?) returning "id"',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test2@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test3@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }, { id: '2' }]
            );
            tester(
              'pg-redshift',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test2@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test3@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              2
            );
            tester(
              'sqlite3',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) select ? as `about`, ? as `created_at`, ? as `email`, ? as `first_name`, ? as `last_name`, ? as `logins`, ? as `updated_at` union all select ? as `about`, ? as `created_at`, ? as `email`, ? as `first_name`, ? as `last_name`, ? as `logins`, ? as `updated_at` returning `id`',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test2@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test3@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: 1 }, { id: 2 }]
            );
            tester(
              'oracledb',
              'begin execute immediate \'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (:1, :2, :3, :4, :5, :6, :7) returning "id" into :8\' using ?, ?, ?, ?, ?, ?, ?, out ?; execute immediate \'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (:1, :2, :3, :4, :5, :6, :7) returning "id" into :8\' using ?, ?, ?, ?, ?, ?, ?, out ?;end;',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test2@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test3@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              [{ id: 1 }, { id: 2 }]
            );
            tester(
              'mssql',
              'insert into [accounts] ([about], [created_at], [email], [first_name], [last_name], [logins], [updated_at]) output inserted.[id] values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test2@example.com',
                'Test',
                'User',
                1,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test3@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }, { id: '2' }]
            );
          });
      });

      it('should allow for using the `asCallback` interface', function (ok) {
        knex('test_table_two')
          .insert(
            [
              {
                account_id: 1,
                details:
                  'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                status: 0,
              },
              {
                account_id: 2,
                details:
                  'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                status: 1,
              },
              {
                account_id: 3,
                details: '',
                status: 1,
              },
            ],
            'id'
          )
          .testSql(function (tester) {
            tester(
              'oracledb',
              'begin execute immediate \'insert into "test_table_two" ("account_id", "details", "status") values (:1, :2, :3) returning "id" into :4\' using ?, ?, ?, out ?; execute immediate \'insert into "test_table_two" ("account_id", "details", "status") values (:1, :2, :3) returning "id" into :4\' using ?, ?, ?, out ?; execute immediate \'insert into "test_table_two" ("account_id", "details", "status") values (:1, :2, :3) returning "id" into :4\' using ?, ?, ?, out ?;end;',
              [
                1,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
                2,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                1,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
                3,
                '',
                1,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              ['1', '2', '3']
            );
          })
          .asCallback(function (err) {
            if (err) return ok(err);
            ok();
          });
      });

      it('should take hashes passed into insert and keep them in the correct order', async function () {
        await knex('accounts')
          .insert(
            [
              {
                first_name: 'Test',
                last_name: 'User',
                email: 'test4@example.com',
                about: 'Lorem ipsum Dolore labore incididunt enim.',
                logins: 2,
                created_at: TEST_TIMESTAMP,
                updated_at: TEST_TIMESTAMP,
              },
              {
                first_name: 'Test',
                about: 'Lorem ipsum Dolore labore incididunt enim.',
                logins: 2,
                created_at: TEST_TIMESTAMP,
                updated_at: TEST_TIMESTAMP,
                last_name: 'User',
                email: 'test5@example.com',
              },
            ],
            'id'
          )
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test4@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [1]
            );
            tester(
              'pg',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?) returning "id"',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test4@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }, { id: '2' }]
            );
            tester(
              'pg-redshift',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test4@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              2
            );
            tester(
              'sqlite3',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) select ? as `about`, ? as `created_at`, ? as `email`, ? as `first_name`, ? as `last_name`, ? as `logins`, ? as `updated_at` union all select ? as `about`, ? as `created_at`, ? as `email`, ? as `first_name`, ? as `last_name`, ? as `logins`, ? as `updated_at` returning `id`',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test4@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: 1 }, { id: 2 }]
            );
            tester(
              'oracledb',
              'begin execute immediate \'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (:1, :2, :3, :4, :5, :6, :7) returning "id" into :8\' using ?, ?, ?, ?, ?, ?, ?, out ?; execute immediate \'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (:1, :2, :3, :4, :5, :6, :7) returning "id" into :8\' using ?, ?, ?, ?, ?, ?, ?, out ?;end;',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test4@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              [{ id: 1 }, { id: 2 }]
            );
            tester(
              'mssql',
              'insert into [accounts] ([about], [created_at], [email], [first_name], [last_name], [logins], [updated_at]) output inserted.[id] values (?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test4@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }, { id: '2' }]
            );
          });
      });

      it('will fail when multiple inserts are made into a unique column', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }
        await knex('accounts').where('id', '>', 1).orWhere('x', 2).insert(
          {
            first_name: 'Test',
            last_name: 'User',
            email: 'test5@example.com',
            about: 'Lorem ipsum Dolore labore incididunt enim.',
            logins: 2,
            created_at: TEST_TIMESTAMP,
            updated_at: TEST_TIMESTAMP,
          },
          'id'
        );

        await knex('accounts')
          .where('id', '>', 1)
          .orWhere('x', 2)
          .insert(
            {
              first_name: 'Test',
              last_name: 'User',
              email: 'test5@example.com',
              about: 'Lorem ipsum Dolore labore incididunt enim.',
              logins: 2,
              created_at: TEST_TIMESTAMP,
              updated_at: TEST_TIMESTAMP,
            },
            'id'
          )
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ]
            );
            tester(
              'pg',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?) returning "id"',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ]
            );
            tester(
              'sqlite3',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?) returning `id`',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ]
            );
            tester(
              'oracledb',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?) returning "id" into ?',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ]
            );
            tester(
              'mssql',
              'insert into [accounts] ([about], [created_at], [email], [first_name], [last_name], [logins], [updated_at]) output inserted.[id] values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test5@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ]
            );
          })
          .then(
            function () {
              throw new Error(
                'There should be a fail when multi-insert are made in unique col.'
              );
            },
            function () {}
          );
      });

      it('should drop any where clause bindings', async function () {
        await knex('accounts')
          .where('id', '>', 1)
          .orWhere('x', 2)
          .insert(
            {
              first_name: 'Test',
              last_name: 'User',
              email: 'test6@example.com',
              about: 'Lorem ipsum Dolore labore incididunt enim.',
              logins: 2,
              created_at: TEST_TIMESTAMP,
              updated_at: TEST_TIMESTAMP,
            },
            'id'
          )
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test6@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [1]
            );
            tester(
              'pg',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?) returning "id"',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test6@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }]
            );
            tester(
              'pg-redshift',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test6@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              1
            );
            tester(
              'sqlite3',
              'insert into `accounts` (`about`, `created_at`, `email`, `first_name`, `last_name`, `logins`, `updated_at`) values (?, ?, ?, ?, ?, ?, ?) returning `id`',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test6@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: 1 }]
            );
            tester(
              'oracledb',
              'insert into "accounts" ("about", "created_at", "email", "first_name", "last_name", "logins", "updated_at") values (?, ?, ?, ?, ?, ?, ?) returning "id" into ?',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test6@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              [[{ id: 1 }]]
            );
            tester(
              'mssql',
              'insert into [accounts] ([about], [created_at], [email], [first_name], [last_name], [logins], [updated_at]) output inserted.[id] values (?, ?, ?, ?, ?, ?, ?)',
              [
                'Lorem ipsum Dolore labore incididunt enim.',
                TEST_TIMESTAMP,
                'test6@example.com',
                'Test',
                'User',
                2,
                TEST_TIMESTAMP,
              ],
              [{ id: '1' }]
            );
          });
      });

      it('should not allow inserting invalid values into enum fields', async function () {
        await knex('datatype_test')
          .insert({ enum_value: 'd' })
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `datatype_test` (`enum_value`) values (?)',
              ['d']
            );
            tester(
              'pg',
              'insert into "datatype_test" ("enum_value") values (?)',
              ['d']
            );
            tester(
              'pg-redshift',
              'insert into "datatype_test" ("enum_value") values (?)',
              ['d']
            );
            tester(
              'sqlite3',
              'insert into `datatype_test` (`enum_value`) values (?)',
              ['d'],
              [1]
            );
            tester(
              'oracledb',
              'insert into "datatype_test" ("enum_value") values (?)',
              ['d']
            );
            tester(
              'mssql',
              'insert into [datatype_test] ([enum_value]) values (?)',
              ['d']
            );
          })
          .then(
            function () {
              // No errors happen in sqlite3, which doesn't have native support
              // for the enum type.
              if (!isSQLite(knex)) {
                throw new Error(
                  'There should be an error for invalid enum inserts'
                );
              }
            },
            function () {}
          );
      });

      it('should not allow invalid uuids in postgresql', async function () {
        await knex('datatype_test')
          .insert({
            enum_value: 'c',
            uuid: 'c39d8fcf-68a0-4902-b192-1ebb6310d9ad',
          })
          .then(function () {
            return knex('datatype_test').insert({
              enum_value: 'c',
              uuid: 'test',
            });
          })
          .then(
            function () {
              // No errors happen in sqlite3 or mysql, which don't have native support
              // for the uuid type.
              if (isPostgreSQL(knex) || isMssql(knex)) {
                throw new Error(
                  'There should be an error in postgresql for uuids'
                );
              }
            },
            function () {}
          );
      });

      it('should not mutate the array passed in', async function () {
        const a = {
          enum_value: 'a',
          uuid: '00419fc1-7eed-442c-9c01-cf757e74b8f0',
        };
        const b = {
          enum_value: 'c',
          uuid: '13ac5acd-c5d7-41a0-8db0-dacf64d0e4e2',
        };
        const x = [a, b];

        await knex('datatype_test').insert(x);
        expect(x).to.eql([a, b]);
      });

      it('should throw an error if the array passed in is empty', async function () {
        await expect(knex('account').insert([])).to.be.rejectedWith(
          Error,
          'The query is empty'
        );
      });

      it('should handle empty inserts', async function () {
        await knex.schema.createTable('test_default_table', function (qb) {
          qb.increments().primary();
          qb.string('string').defaultTo('hello');
          qb.tinyint('tinyint').defaultTo(0);
          qb.text('text').nullable();
        });
        await knex('test_default_table')
          .insert({}, 'id')
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `test_default_table` () values ()',
              [],
              [1]
            );
            tester(
              'pg',
              'insert into "test_default_table" default values returning "id"',
              [],
              [{ id: 1 }]
            );
            tester(
              'pg-redshift',
              'insert into "test_default_table" default values',
              [],
              1
            );
            tester(
              'sqlite3',
              'insert into `test_default_table` default values',
              [],
              [1]
            );
            tester(
              'oracledb',
              'insert into "test_default_table" ("id") values (default) returning "id" into ?',
              [
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              [{ id: 1 }]
            );
            tester(
              'mssql',
              'insert into [test_default_table] output inserted.[id] default values',
              [],
              [{ id: 1 }]
            );
          });
      });

      it('should handle empty arrays inserts', async function () {
        await knex.schema.createTable('test_default_table2', function (qb) {
          qb.increments().primary();
          qb.string('string').defaultTo('hello');
          qb.tinyint('tinyint').defaultTo(0);
          qb.text('text').nullable();
        });
        await knex('test_default_table2')
          .insert([{}], 'id')
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `test_default_table2` () values ()',
              [],
              [1]
            );
            tester(
              'pg',
              'insert into "test_default_table2" default values returning "id"',
              [],
              [{ id: 1 }]
            );
            tester(
              'pg-redshift',
              'insert into "test_default_table2" default values',
              [],
              1
            );
            tester(
              'sqlite3',
              'insert into `test_default_table2` default values',
              [],
              [1]
            );
            tester(
              'oracledb',
              'insert into "test_default_table2" ("id") values (default) returning "id" into ?',
              [
                function (v) {
                  return v.toString() === '[object ReturningHelper:id]';
                },
              ],
              [{ id: 1 }]
            );
            tester(
              'mssql',
              'insert into [test_default_table2] output inserted.[id] default values',
              [],
              [{ id: 1 }]
            );
          });
      });

      it('should take an array of columns to return in oracle or postgres', async function () {
        const insertData = {
          account_id: 10,
          details:
            'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
          status: 0,
        };
        const rows = await knex('test_table_two')
          .insert(insertData, ['account_id', 'details'])
          .testSql(function (tester) {
            tester(
              'mysql',
              'insert into `test_table_two` (`account_id`, `details`, `status`) values (?, ?, ?)',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              [1]
            );
            tester(
              'pg',
              'insert into "test_table_two" ("account_id", "details", "status") values (?, ?, ?) returning "account_id", "details"',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              [
                {
                  account_id: 10,
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                },
              ]
            );
            tester(
              'pg-redshift',
              'insert into "test_table_two" ("account_id", "details", "status") values (?, ?, ?)',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              1
            );
            tester(
              'sqlite3',
              'insert into `test_table_two` (`account_id`, `details`, `status`) values (?, ?, ?) returning `account_id`, `details`',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              [
                {
                  account_id: 10,
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                },
              ]
            );
            tester(
              'oracledb',
              `insert into "test_table_two" ("account_id", "details", "status") values (?, ?, ?) returning "account_id","details" into ?,?`,
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
                function (v) {
                  return v.toString() === '[object ReturningHelper:account_id]';
                },
                function (v) {
                  return v.toString() === '[object ReturningHelper:details]';
                },
              ],
              [
                {
                  account_id: '10',
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                },
              ]
            );
            tester(
              'mssql',
              'insert into [test_table_two] ([account_id], [details], [status]) output inserted.[account_id], inserted.[details] values (?, ?, ?)',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              [
                {
                  account_id: 10,
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                },
              ]
            );
          });

        if (isRedshift(knex)) {
          return expect(rows).to.equal(1);
        }
        expect(rows.length).to.equal(1);
        if (isPostgreSQL(knex)) {
          expect(_.keys(rows[0]).length).to.equal(2);
          expect(rows[0].account_id).to.equal(insertData.account_id);
          expect(rows[0].details).to.equal(insertData.details);
        }
      });

      it('should allow a * for returning in postgres and oracle', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }
        const insertData = {
          account_id: 10,
          details:
            'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
          status: 0,
        };

        const returningColumn = '*';
        const rows = await knex('test_table_two')
          .insert(insertData, returningColumn)
          .testSql(function (tester) {
            tester(
              ['pg'],
              'insert into "test_table_two" ("account_id", "details", "status") values (?, ?, ?) returning *',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              [
                {
                  id: 1,
                  account_id: 10,
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                  status: 0,
                },
              ]
            );
            tester(
              'oracledb',
              'insert into "test_table_two" ("account_id", "details", "status") values (?, ?, ?) returning "ROWID" into ?',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
                function (v) {
                  return v.toString() === '[object ReturningHelper:ROWID]';
                },
              ],
              [
                {
                  id: 1,
                  account_id: 10,
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                  status: 0,
                },
              ]
            );
            tester(
              'mssql',
              'insert into [test_table_two] ([account_id], [details], [status]) output inserted.* values (?, ?, ?)',
              [
                10,
                'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                0,
              ],
              [
                {
                  id: 1,
                  account_id: 10,
                  details:
                    'Lorem ipsum Minim nostrud Excepteur consectetur enim ut qui sint in veniam in nulla anim do cillum sunt voluptate Duis non incididunt.',
                  status: 0,
                },
              ]
            );
          });

        expect(rows.length).to.equal(1);
        if (isPgBased(knex)) {
          expect(_.keys(rows[0]).length).to.equal(4);
          assertNumber(knex, rows[0].account_id, insertData.account_id);
          expect(rows[0].details).to.equal(insertData.details);
          expect(rows[0].status).to.equal(insertData.status);
        }
      });

      describe('batchInsert', function () {
        const fiftyLengthString =
          'rO8F8YrFS6uoivuRiVnwrO8F8YrFS6uoivuRiVnwuoivuRiVnw';
        const items = [];
        const amountOfItems = 100;
        const amountOfColumns = 30;
        for (let i = 0; i < amountOfItems; i++) {
          const item = {};
          for (let x = 0; x < amountOfColumns; x++) {
            item['Col' + x] = fiftyLengthString;
          }
          items.push(item);
        }

        beforeEach(async () => {
          await knex.schema.dropTableIfExists('BatchInsert');
          await knex.schema.createTable('BatchInsert', (table) => {
            for (let i = 0; i < amountOfColumns; i++) {
              table.string('Col' + i, 50);
            }
          });
        });

        it('#757 - knex.batchInsert(tableName, bulk, chunkSize)', async function () {
          this.timeout(30000);
          const result = await knex
            .batchInsert('BatchInsert', items, 30)
            .returning(['Col1', 'Col2']);

          //Returning only supported by some dialects.
          if (isPostgreSQL(knex) || isOracle(knex)) {
            result.forEach(function (item) {
              expect(item.Col1).to.equal(fiftyLengthString);
              expect(item.Col2).to.equal(fiftyLengthString);
            });
          }

          const selectResult = await knex('BatchInsert').select();
          const count = selectResult.length;
          expect(count).to.equal(amountOfItems);
        });

        it('#1880 - Duplicate keys in batchInsert should not throw unhandled exception', async function () {
          if (isRedshift(knex)) {
            return this.skip();
          }
          this.timeout(10000);

          const fn = sinon.stub();
          process.on('unhandledRejection', fn);
          await knex.schema.dropTableIfExists('batchInsertDuplicateKey');

          await knex.schema.createTable(
            'batchInsertDuplicateKey',
            function (table) {
              table.string('col').notNullable();
              table.primary('col');
            }
          );
          const rows = [{ col: 'a' }, { col: 'a' }];

          try {
            await knex.batchInsert(
              'batchInsertDuplicateKey',
              rows,
              rows.length
            );
          } catch (err) {
            //Should reach this point before timeout of 10s
            expect(err.message.toLowerCase()).to.include(
              'batchinsertduplicatekey'
            );
            expect(fn).have.not.been.called;
            process.removeListener('unhandledRejection', fn);
            return;
          }
          expect.fail('Should not reach this point');
        });

        it('knex.batchInsert with specified transaction', async function () {
          await knex.transaction(function (tr) {
            knex
              .batchInsert('BatchInsert', items, 30)
              .returning(['Col1', 'Col2'])
              .transacting(tr)
              .then(tr.commit)
              .catch(tr.rollback);
          });
        });

        it('transaction.batchInsert using specified transaction', async function () {
          await knex.transaction(function (tr) {
            return tr
              .batchInsert('BatchInsert', items, 30)
              .returning(['Col1', 'Col2']);
          });
        });
      });

      it('should validate batchInsert batchSize parameter', async function () {
        //Should not throw, batchSize default
        await knex.batchInsert('test', []);

        try {
          knex.batchInsert('test', [], null);
        } catch (error) {
          expect(error.message).to.equal('Invalid chunkSize: null');
          try {
            knex.batchInsert('test', [], 0);
          } catch (error) {
            expect(error.message).to.equal('Invalid chunkSize: 0');
            try {
              //Also faulty
              knex.batchInsert('test', [], 'still no good');
            } catch (error) {
              expect(error.message).to.equal(
                'Invalid chunkSize: still no good'
              );
              return true;
            }
          }
        }
      });

      it('should replace undefined keys in multi insert with DEFAULT', async function () {
        if (isSQLite(knex)) {
          return true;
        }
        await knex('accounts').insert(
          [
            {
              last_name: 'First Item',
              email: 'single-test1@example.com',
              about: 'Lorem ipsum Dolore labore incididunt enim.',
              created_at: new Date(),
              updated_at: new Date(),
            },
            {
              last_name: 'Second Item',
              email: 'double-test1@example.com',
              logins: 2,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          '*'
        );
        const results = await knex('accounts')
          .whereIn('email', [
            'single-test1@example.com',
            'double-test1@example.com',
          ])
          .orderBy('email', 'desc');

        assertNumber(knex, results[0].logins, 1);
        expect(results[1].about).to.equal(null);
        // cleanup to prevent needs for too much changes to other tests
        await knex('accounts')
          .delete()
          .whereIn(
            'id',
            results.map(function (row) {
              return row.id;
            })
          );
      });

      it('will silently do nothing when multiple inserts are made into a unique column and ignore is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert({
          email: 'ignoretest1@example.com',
          name: 'BEFORE',
        });

        // Test: Insert..ignore with same email as existing row
        try {
          await knex('upsert_tests')
            .insert(
              { email: 'ignoretest1@example.com', name: 'AFTER' },
              'email'
            )
            .onConflict('email')
            .ignore()
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert ignore into `upsert_tests` (`email`, `name`) values (?, ?)',
                ['ignoretest1@example.com', 'AFTER']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict ("email") do nothing returning "email"',
                ['ignoretest1@example.com', 'AFTER']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict (`email`) do nothing returning `email`',
                ['ignoretest1@example.com', 'AFTER']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Assert: there is still only 1 row, and that it HAS NOT been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'ignoretest1@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('BEFORE');
      });

      it('will still silently do nothing when multiple inserts are made into a unique column and ignore is specified with no columns', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert({
          email: 'ignoretest1@example.com',
          name: 'BEFORE',
        });

        // Test: Insert..ignore with same email as existing row
        try {
          await knex('upsert_tests')
            .insert(
              { email: 'ignoretest1@example.com', name: 'AFTER' },
              'email'
            )
            .onConflict()
            .ignore()
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert ignore into `upsert_tests` (`email`, `name`) values (?, ?)',
                ['ignoretest1@example.com', 'AFTER']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict do nothing returning "email"',
                ['ignoretest1@example.com', 'AFTER']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict do nothing returning `email`',
                ['ignoretest1@example.com', 'AFTER']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Assert: there is still only 1 row, and that it HAS NOT been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'ignoretest1@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('BEFORE');
      });

      it('will silently do nothing when multiple inserts are made into a composite unique column and ignore is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_composite_key_tests');
        await knex.schema.createTable('upsert_composite_key_tests', (table) => {
          table.string('name');
          table.string('email');
          table.string('org');
          table.unique(['org', 'email']);
        });

        // Setup: Create row to conflict against
        await knex('upsert_composite_key_tests').insert({
          org: 'acme-inc',
          email: 'ignoretest1@example.com',
          name: 'BEFORE',
        });

        // Test: Insert..ignore with same email as existing row
        try {
          await knex('upsert_composite_key_tests')
            .insert(
              {
                org: 'acme-inc',
                email: 'ignoretest1@example.com',
                name: 'AFTER',
              },
              'email'
            )
            .onConflict(['org', 'email'])
            .ignore()
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert ignore into `upsert_composite_key_tests` (`email`, `name`, `org`) values (?, ?, ?)',
                ['ignoretest1@example.com', 'AFTER', 'acme-inc']
              );
              tester(
                'pg',
                'insert into "upsert_composite_key_tests" ("email", "name", "org") values (?, ?, ?) on conflict ("org", "email") do nothing returning "email"',
                ['ignoretest1@example.com', 'AFTER', 'acme-inc']
              );
              tester(
                'sqlite3',
                'insert into `upsert_composite_key_tests` (`email`, `name`, `org`) values (?, ?, ?) on conflict (`org`, `email`) do nothing returning `email`',
                ['ignoretest1@example.com', 'AFTER', 'acme-inc']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Assert: there is still only 1 row, and that it HAS NOT been updated
        const rows = await knex('upsert_composite_key_tests')
          .where({ email: 'ignoretest1@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('BEFORE');
      });

      it('updates columns when inserting a duplicate key to unique column and merge is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert({
          email: 'mergetest1@example.com',
          name: 'BEFORE',
        });

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert({ email: 'mergetest1@example.com', name: 'AFTER' }, 'email')
            .onConflict('email')
            .merge()
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on duplicate key update `email` = values(`email`), `name` = values(`name`)',
                ['mergetest1@example.com', 'AFTER']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict ("email") do update set "email" = excluded."email", "name" = excluded."name" returning "email"',
                ['mergetest1@example.com', 'AFTER']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict (`email`) do update set `email` = excluded.`email`, `name` = excluded.`name` returning `email`',
                ['mergetest1@example.com', 'AFTER']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'mergetest1@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('AFTER');
      });

      it('conditionally updates rows when inserting a duplicate key to unique column and merge with where clause matching row(s) is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.string('role');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert({
          email: 'mergetest1@example.com',
          role: 'tester',
          name: 'BEFORE',
        });

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert({ email: 'mergetest1@example.com', name: 'AFTER' }, 'email')
            .onConflict('email')
            .merge()
            .where('upsert_tests.role', 'tester')
            .testSql(function (tester) {
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict ("email") do update set "email" = excluded."email", "name" = excluded."name" where "upsert_tests"."role" = ? returning "email"',
                ['mergetest1@example.com', 'AFTER', 'tester']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict (`email`) do update set `email` = excluded.`email`, `name` = excluded.`name` where `upsert_tests`.`role` = ? returning `email`',
                ['mergetest1@example.com', 'AFTER', 'tester']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          if (isMysql(knex)) {
            expect(err).to.be.an('error');
            if (
              err.message.includes(
                '.onConflict().merge().where() is not supported for'
              )
            )
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'mergetest1@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('AFTER');
      });

      it('will silently do nothing when inserting a duplicate key to unique column and merge with where clause matching no rows is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.string('role');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert({
          email: 'mergetest1@example.com',
          role: 'tester',
          name: 'BEFORE',
        });

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert({ email: 'mergetest1@example.com', name: 'AFTER' }, 'email')
            .onConflict('email')
            .merge()
            .where('upsert_tests.role', 'fake-role')
            .testSql(function (tester) {
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict ("email") do update set "email" = excluded."email", "name" = excluded."name" where "upsert_tests"."role" = ? returning "email"',
                ['mergetest1@example.com', 'AFTER', 'fake-role']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict (`email`) do update set `email` = excluded.`email`, `name` = excluded.`name` where `upsert_tests`.`role` = ? returning `email`',
                ['mergetest1@example.com', 'AFTER', 'fake-role']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          if (isMysql(knex)) {
            expect(err).to.be.an('error');
            if (
              err.message.includes(
                '.onConflict().merge().where() is not supported for'
              )
            )
              return;
          }
          throw err;
        }

        // Check that row HAS NOT been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'mergetest1@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('BEFORE');
      });

      it('updates all columns with raw value when inserting a duplicate key to unique column and merge is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert([
          { email: 'mergesource@example.com', name: 'SOURCE' },
          { email: 'mergedest@example.com', name: 'DEST' },
        ]);

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert(
              {
                email: 'mergedest@example.com',
                name: knex.raw(
                  "(SELECT name FROM (SELECT * FROM upsert_tests) AS t WHERE email = 'mergesource@example.com')"
                ),
              },
              'email'
            )
            .onConflict('email')
            .merge()
            .testSql(function (tester) {
              tester(
                'mysql',
                "insert into `upsert_tests` (`email`, `name`) values (?, (SELECT name FROM (SELECT * FROM upsert_tests) AS t WHERE email = 'mergesource@example.com')) on duplicate key update `email` = values(`email`), `name` = values(`name`)",
                ['mergedest@example.com']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, (SELECT name FROM (SELECT * FROM upsert_tests) AS t WHERE email = \'mergesource@example.com\')) on conflict ("email") do update set "email" = excluded."email", "name" = excluded."name" returning "email"',
                ['mergedest@example.com']
              );
              tester(
                'sqlite3',
                "insert into `upsert_tests` (`email`, `name`) values (?, (SELECT name FROM (SELECT * FROM upsert_tests) AS t WHERE email = 'mergesource@example.com')) on conflict (`email`) do update set `email` = excluded.`email`, `name` = excluded.`name` returning `email`",
                ['mergedest@example.com']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'mergedest@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('SOURCE');
      });

      it('updates columns with raw value when inserting a duplicate key to unique column and merge with update data is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup table for testing knex.raw with
        await knex.schema.dropTableIfExists('upsert_value_source');
        await knex.schema.createTable('upsert_value_source', (table) => {
          table.string('name');
        });
        await knex('upsert_value_source').insert([{ name: 'SOURCE' }]);

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert([
          { email: 'mergedest@example.com', name: 'DEST' },
        ]);

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert(
              { email: 'mergedest@example.com', name: 'SHOULD NOT BE USED' },
              'email'
            )
            .onConflict('email')
            .merge({ name: knex.raw('(SELECT name FROM upsert_value_source)') })
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on duplicate key update `name` = (SELECT name FROM upsert_value_source)',
                ['mergedest@example.com', 'SHOULD NOT BE USED']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict ("email") do update set "name" = (SELECT name FROM upsert_value_source) returning "email"',
                ['mergedest@example.com', 'SHOULD NOT BE USED']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict (`email`) do update set `name` = (SELECT name FROM upsert_value_source) returning `email`',
                ['mergedest@example.com', 'SHOULD NOT BE USED']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'mergedest@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('SOURCE');
      });

      it('updates specified columns with insert value when inserting a duplicate key to unique column and merge with update columns is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup table for testing knex.raw with
        await knex.schema.dropTableIfExists('upsert_value_source');
        await knex.schema.createTable('upsert_value_source', (table) => {
          table.string('name');
        });
        await knex('upsert_value_source').insert([{ name: 'SOURCE' }]);

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert([
          { email: 'mergedest@example.com', name: 'DEST' },
        ]);

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert(
              { email: 'mergedest@example.com', name: 'SHOULD BE USED' },
              'email'
            )
            .onConflict('email')
            .merge(['name'])
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on duplicate key update `name` = values(`name`)',
                ['mergedest@example.com', 'SHOULD BE USED']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?) on conflict ("email") do update set "name" = excluded."name" returning "email"',
                ['mergedest@example.com', 'SHOULD BE USED']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?) on conflict (`email`) do update set `name` = excluded.`name` returning `email`',
                ['mergedest@example.com', 'SHOULD BE USED']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests')
          .where({ email: 'mergedest@example.com' })
          .select();
        expect(rows.length).to.equal(1);
        expect(rows[0].name).to.equal('SHOULD BE USED');
      });

      it('updates and inserts columns when inserting multiple rows merge is specified', async function () {
        if (isRedshift(knex)) {
          return this.skip();
        }

        // Setup: Create table with unique email column
        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('email');
          table.unique('email');
        });

        // Setup: Create row to conflict against
        await knex('upsert_tests').insert([
          { email: 'one@example.com', name: 'BEFORE' },
          { email: 'two@example.com', name: 'BEFORE' },
        ]);

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert(
              [
                { email: 'two@example.com', name: 'AFTER' },
                { email: 'three@example.com', name: 'AFTER' },
              ],
              'email'
            )
            .onConflict('email')
            .merge()
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?), (?, ?) on duplicate key update `email` = values(`email`), `name` = values(`name`)',
                ['two@example.com', 'AFTER', 'three@example.com', 'AFTER']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name") values (?, ?), (?, ?) on conflict ("email") do update set "email" = excluded."email", "name" = excluded."name" returning "email"',
                ['two@example.com', 'AFTER', 'three@example.com', 'AFTER']
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`) select ? as `email`, ? as `name` union all select ? as `email`, ? as `name` where true on conflict (`email`) do update set `email` = excluded.`email`, `name` = excluded.`name` returning `email`',
                ['two@example.com', 'AFTER', 'three@example.com', 'AFTER']
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests').select();
        expect(rows.length).to.equal(3);

        const row1 = rows.find((row) => row.email === 'one@example.com');
        expect(row1 && row1.name).to.equal('BEFORE');
        const row2 = rows.find((row) => row.email === 'two@example.com');
        expect(row2 && row2.name).to.equal('AFTER');
        const row3 = rows.find((row) => row.email === 'three@example.com');
        expect(row3 && row3.name).to.equal('AFTER');
      });

      it('update values on conflict with "where" condition and partial unique index #4590', async function () {
        if (!isPostgreSQL(knex) && !isSQLite(knex)) {
          return this.skip();
        }

        await knex.schema.dropTableIfExists('upsert_tests');
        await knex.schema.createTable('upsert_tests', (table) => {
          table.string('name');
          table.string('type');
          table.string('email');
        });
        await knex.raw(
          'create unique index email_type1 ' +
            'on upsert_tests(email) ' +
            "where type = 'type1'"
        );

        await knex('upsert_tests').insert([
          { email: 'one@example.com', name: 'BEFORE', type: 'type1' },
          { email: 'two@example.com', name: 'BEFORE', type: 'type1' },
          { email: 'two@example.com', name: 'BEFORE', type: 'type2' },
        ]);

        // Perform insert..merge (upsert)
        try {
          await knex('upsert_tests')
            .insert([
              { email: 'one@example.com', name: 'AFTER', type: 'type1' },
              { email: 'two@example.com', name: 'AFTER', type: 'type1' },
              { email: 'three@example.com', name: 'AFTER', type: 'type1' },
            ])
            .onConflict(knex.raw("(email) where type = 'type1'"))
            .merge()
            .testSql(function (tester) {
              tester(
                'mysql',
                'insert into `upsert_tests` (`email`, `name`) values (?, ?), (?, ?) on duplicate key update `email` = values(`email`), `name` = values(`name`)',
                ['two@example.com', 'AFTER', 'three@example.com', 'AFTER']
              );
              tester(
                'pg',
                'insert into "upsert_tests" ("email", "name", "type") values (?, ?, ?), (?, ?, ?), (?, ?, ?) on conflict (email) where type = \'type1\' do update set "email" = excluded."email", "name" = excluded."name", "type" = excluded."type"',
                [
                  'one@example.com',
                  'AFTER',
                  'type1',
                  'two@example.com',
                  'AFTER',
                  'type1',
                  'three@example.com',
                  'AFTER',
                  'type1',
                ]
              );
              tester(
                'sqlite3',
                'insert into `upsert_tests` (`email`, `name`, `type`) select ? as `email`, ? as `name`, ? as `type` union all select ? as `email`, ? as `name`, ? as `type` union all select ? as `email`, ? as `name`, ? as `type` where true ' +
                  "on conflict (email) where type = 'type1' do update set `email` = excluded.`email`, `name` = excluded.`name`, `type` = excluded.`type`",
                [
                  'one@example.com',
                  'AFTER',
                  'type1',
                  'two@example.com',
                  'AFTER',
                  'type1',
                  'three@example.com',
                  'AFTER',
                  'type1',
                ]
              );
            });
        } catch (err) {
          if (isOracle(knex) || isMssql(knex)) {
            expect(err).to.be.an('error');
            if (err.message.includes('.onConflict() is not supported for'))
              return;
          }
          throw err;
        }

        // Check that row HAS been updated
        const rows = await knex('upsert_tests')
          .select()
          .orderBy(['email', 'name']);
        expect(rows.length).to.equal(4);

        expect(rows).to.eql([
          { email: 'one@example.com', name: 'AFTER', type: 'type1' }, // type1 => updated
          { email: 'three@example.com', name: 'AFTER', type: 'type1' },
          { email: 'two@example.com', name: 'AFTER', type: 'type1' }, // type1 => updated
          { email: 'two@example.com', name: 'BEFORE', type: 'type2' }, // type2 => not updated
        ]);
      });

      it('#1423 should replace undefined keys in single insert with DEFAULT also in transacting query', async function () {
        if (isSQLite(knex)) {
          return true;
        }
        await knex.transaction(function (trx) {
          return trx('accounts')
            .insert({
              last_name: 'First Item',
              email: 'findme@example.com',
              logins: undefined,
              about: 'Lorem ipsum Dolore labore incididunt enim.',
              created_at: new Date(),
              updated_at: new Date(),
            })
            .then(function (results) {
              return trx('accounts').where('email', 'findme@example.com');
            })
            .then(function (results) {
              assertNumber(knex, results[0].logins, 1);
              // cleanup to prevent needs for too much changes to other tests
              return trx('accounts').delete().where('id', results[0].id);
            });
        });
      });

      it('should insert arrays into postgres array columns #5365', async function () {
        if (!isPostgreSQL(knex)) {
          return this.skip();
        }

        await knex.schema.dropTableIfExists('redirect_array');
        await knex.schema.createTable('redirect_array', (table) => {
          table.increments();
          table.string('name');
          table.specificType('redirect_urls', 'text ARRAY');
        });

        await knex('redirect_array')
          .insert(
            {
              name: 'knex',
              redirect_urls: [
                'https://knexjs.org/',
                'https://knexjs.org/guide/',
              ],
            },
            'id'
          )
          .testSql(function (tester) {
            tester(
              'pg',
              'insert into "redirect_array" ("name", "redirect_urls") values (?, ?) returning "id"',
              ['knex', ['https://knexjs.org/', 'https://knexjs.org/guide/']],
              [{ id: 1 }]
            );
          });
      });

      it('insert json object to json column', async function () {
        if (!isPostgreSQL(knex)) {
          return this.skip();
        }
        const tableName = 'json';
        const jsonObject = {
          foo: {
            bar: 'baz',
          },
        };

        await knex.schema.dropTableIfExists(tableName);
        await knex.schema.createTable(tableName, (table) => {
          table.increments();
          table.string('name');
          table.jsonb('content');
        });

        await knex(tableName)
          .insert(
            {
              name: 'json_object',
              content: jsonObject,
            },
            'id'
          )
          .testSql(function (tester) {
            tester(
              'pg',
              `insert into "${tableName}" ("content", "name") values (?, ?) returning "id"`,
              [JSON.stringify(jsonObject), 'json_object']
            );
          })
          .then(([insertResult]) =>
            knex(tableName).where('id', insertResult.id)
          )
          .then((result) => {
            expect(result.length).to.equal(1);
            assertJsonEquals(result[0].content, jsonObject);
          });
      });

      it('insert number array to integer ARRAY column', async function () {
        if (!isPostgreSQL(knex)) {
          return this.skip();
        }
        const tableName = 'integer_array';
        const integerArrayContent = [1, 2, 3, 42, -100];

        await knex.schema.dropTableIfExists(tableName);
        await knex.schema.createTable(tableName, (table) => {
          table.increments();
          table.string('name');
          table.specificType('content', 'integer ARRAY');
        });

        await knex(tableName)
          .insert(
            {
              name: 'integer_array',
              content: integerArrayContent,
            },
            'id'
          )
          .testSql(function (tester) {
            tester(
              'pg',
              `insert into "${tableName}" ("content", "name") values (?, ?) returning "id"`,
              [integerArrayContent, 'integer_array']
            );
          })
          .then(([insertResult]) =>
            knex(tableName).where('id', insertResult.id)
          )
          .then((result) => {
            expect(result.length).to.equal(1);
            assertJsonEquals(result[0].content, integerArrayContent);
          });
      });

      describe('text array', () => {
        const tableName = 'text_array';

        beforeEach(async () => {
          if (!isPostgreSQL(knex)) {
            return true;
          }
          await knex.schema.dropTableIfExists(tableName);
          await knex.schema.createTable(tableName, (table) => {
            table.increments();
            table.string('name');
            table.specificType('content', 'text ARRAY');
          });
        });

        it('#5365 should insert string array to text ARRAY column', async function () {
          if (!isPostgreSQL(knex)) {
            return this.skip();
          }

          const stringArrayContent = ['SOME TEXT', 'SOME OTHER TEXT'];

          await knex(tableName)
            .insert(
              {
                name: 'array_of_string',
                content: stringArrayContent,
              },
              'id'
            )
            .testSql(function (tester) {
              tester(
                'pg',
                `insert into "${tableName}" ("content", "name") values (?, ?) returning "id"`,
                [stringArrayContent, 'array_of_string'],
                [{ id: 1 }]
              );
            })
            .then(([insertResult]) =>
              knex(tableName).where('id', insertResult.id)
            )
            .then((result) => {
              expect(result.length).to.equal(1);
              expect(result[0].content).to.deep.equal(stringArrayContent);
            });
        });

        it(`#5430 should insert data to text array column if it's an array of object`, async function () {
          if (!isPostgreSQL(knex)) {
            return this.skip();
          }

          const arrayOfObject = [
            {
              foo: {
                bar: 'baz',
              },
            },
          ];

          await knex(tableName)
            .insert(
              {
                name: 'array_of_object',
                content: arrayOfObject,
              },
              'id'
            )
            .testSql(function (tester) {
              tester(
                'pg',
                `insert into "${tableName}" ("content", "name") values (?, ?) returning "id"`,
                [arrayOfObject, 'array_of_object'],
                [{ id: 1 }]
              );
            })
            .then(([insertResult]) =>
              knex(tableName).where('id', insertResult.id)
            )
            .then((result) => {
              expect(result.length).to.equal(1);
              assertJsonEquals(result[0].content, arrayOfObject);
            });
        });
      });
    });
  });
});
