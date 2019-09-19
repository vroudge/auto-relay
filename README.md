# AutoRelay 
[![npm version](https://badge.fury.io/js/auto-relay.svg)](https://badge.fury.io/js/auto-relay)
[![Build Status](https://travis-ci.org/wemaintain/auto-relay.svg?branch=master)](https://travis-ci.org/wemaintain/auto-relay)

AutoRelay is a librairy designed to work alongside [TypeGraphQL](https://typegraphql.ml/) and make it easy to paginate your results using the [Relay spec](https://facebook.github.io/relay/graphql/connections.htm).

Please note this is currently a W.I.P, expect frequent breaking changes in the API until 1.0.0

AutoRelay is meant to be *plug and play* with TypeGraphQL and TypeORM (*more orm support such as sequelize-typescript could be supported*). Simply decorate your relations with `@RelayedConnection` as such:
```typescript
@Entity()
@ObjectType()
class User {
  @OneToMany(() => Recipe)
  @RelayedConnection(() => Recipe)
  recipes: Recipe[];
}
```

This will result in the following working SDL:
```graphql
// Autogenrated by AutoRelay
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String!
  endCursor: String!
}

// AutoGenerated by AutoRelay
type UserRecipeConnection {
  edges: [UserRecipeEdge]!
  pageInfo: PageInfo!
}

// AutoGenerated by AutoRelay
type UserRecipeEdge {
  cursor: String!
  node: Recipe!
}

type Recipe {
  // ...
}

type User {
  recipes(...): UserRecipeConnection
}
```

where `User.recipes` is now a fully working field resolver, that automatically takes Relay ConnectionArguments (*first, before, after, last*) and returns a Relay Connection containing the results.


## Installation

*This lib is meant to be used with TypeGraphQL. It will not work with other code-first graphql librairies* 


1. Install the npm package:

    `npm install auto-relay --save`

2. (Install an ORM *if you plan to use `@RelayedConnection`*)

    *currently only TypeORM is supported*

    `npm install @auto-relay/typeorm`


## Quick Start

Simply configure AutoRelay to use your ORM of choice, and you're ready to go !

*index.ts*
```typescript
import { TypeOrmConnection } from '@auto-relay/typeorm'
import { AutoRelayConfig } from 'auto-relay'

new AutoRelayConfig({ orm: () => TypeOrmConnection })

```



## Step-by-step guide
AutoRelay was designed with two goals in mind : Firstly, to automate the pagination between two entities that share a relationship in TypeORM. Secondly, to make it easy and boilerplate-free to implement your own Relay logic. This guide will showcase both of those.

### Making a relationship relayable.
Let's say you currently have two entities / graphql objects, `User` and `Recipe`. A recipe is always linked to an user, and a given user can have multiple recipes. Your classes might look like that :

```typescript
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Recipe)
  @Field(() => [Recipe])
  recipes: Recipe[]
}

export class Recipe {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field(() => Int)
  rating: number

  @ManyToOne(() => User)
  user: User
}
```

With some custom logic (either lazy-loading or field resolvers) to fetch User.recipes / Recipe.user.

With AutoRelay, we're gonna replace all that logic with a single decorator, `@RelayedConnection`. 

Our `User` will now look like this :

```typescript
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Recipe)
  @RelayedConnection(() => Recipe)
  recipes: Recipe[]
}
```

This will auto-magically create a few GraphQL types, such as `UserRecipeConnection` and `UserRecipeEdge`. Our User.recipes field now takes Relay's ConnectionArguments and returns `UserRecipeConnection!`.

Our TypeORM integration gets the repository for `Recipe`, translates the ConnectionArguments to an offset/limit tuple and fetches recipes connected to this `User`.


#### Sorting results
@RelayedConnection can optionally accept an order parameter in its options, that will allow you to fetch while sorting on the column of your entities. For example, if we wanted to get our recipes by best ratings :

```typescript
export class User {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: number;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Recipe)
  @RelayedConnection(() => Recipe, { order: { rating: 'DESC' } })
  recipes: Recipe[]
}
```

### Making a Query Relayable
Let's imagine we now have an `users` query, that we want to paginate using Relay. AutoRelay offers a few helpers with that.

```typescript
@Resolver(of => User)
export class UserResolver {

  constructor(
    protected readonly userRepository: Repository<User>
  )

  @RelayedQuery(() => User)
  async users(
    @RelayLimitOffset() {limit, offset}: RelayLimitOffsetArgs
  ): Promise<[number, User[]]> {
    return this.userRepository.findAndCount({ 
      where: { 
        // any business logic you might have
      },
      skip: offset,
      take: limit
    })
  }

}
```

And that's it! Again, AutoRelay has taken care under the hood of a few things:
1. It's created all the necessary GraphQL types for us.
2. It's ensured the `users` query expects Connection Arguments, but conveniently translated them to limit/offset for us.
3. It takes the return of our `findAndCount` calls and automatically transforms it to a Relay `Connection` as expected by GraphQL.


### Extending edges (relationship metadata)
Often, we have relationships that contains metadata. This is particulary the case for N:M relationships, where the join table might contain data our graphql client might want.

AutoRelay offers a simple API to extend the returned `Edges` with information contained in a join table.


```typescript
class EntityA {

    // [...]

    @OneToMany(() => JoinEntity)
    joinEntity: JoinEntity
}

class EntityB {

    // [...]

    @OneToMany(() => JoinEntity)
    joinEntity: JoinEntity
}

class JoinEntity {

  @Column()
  @Field()
  metadata: string;

  @ManyToOne(() => EntityA)
  entityA: EntityA

  @ManyToOne(() => EntityB)
  entityB: EntityB

}
```

Let's say we want EntityB to be queryable with Relay arguments from EntityA. Our code would simply become :

```typescript
class EntityA {

    // [...]

    @OneToMany(() => JoinEntity)
    joinEntity: JoinEntity

    @RelayedConnection(model => EntityB, through => JoinEntity)
    entitiesB: EntityB[];
}
```

This would result in the following working SDL: 

```graphql
type EntityA {
  // ...
  entitiesB: EntitiesAToBConnection!
}

type EntityB {
  // ...
}

type EntitiesAToBConnection {
  edges: [EntityAToBEdge]!
  pageInfo: PageInfo!
}

type EntityAToBEdge {
  cursor: String!
  metadata: String!
  node: EntityB
}
```