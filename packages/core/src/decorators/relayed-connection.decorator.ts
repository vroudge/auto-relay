import { ORMConnection } from '../orm/orm-connection.abstract'
import { Container } from 'typedi'
import { MethodAndPropDecorator, ClassValueThunk } from '../types/types'
import { DynamicObjectFactory } from '../graphql/dynamic-object.factory'

export function RelayedConnection(type: ClassValueThunk): MethodAndPropDecorator
export function RelayedConnection<T=any>(type: ClassValueThunk<T>, options: RelayedConnectionOptions<T>): MethodAndPropDecorator
export function RelayedConnection(type: ClassValueThunk, through: ClassValueThunk): MethodAndPropDecorator
export function RelayedConnection<T=any>(type: ClassValueThunk, through: ClassValueThunk<T>, options: RelayedConnectionOptions<T>): MethodAndPropDecorator
export function RelayedConnection (type: ClassValueThunk, throughOrOptions?: ClassValueThunk | RelayedConnectionOptions, options?: RelayedConnectionOptions): MethodAndPropDecorator {
  return <M>(target: any, propertyKey: string | symbol) => {
    let through: ClassValueThunk | undefined
    
    if(typeof throughOrOptions === "function") {
      through = throughOrOptions
    } else {
      options = throughOrOptions
    }

    process.nextTick(() => {
      const getterName = `relayField${String(propertyKey)}Getter`
      const capitalized = String(propertyKey).charAt(0).toUpperCase() + String(propertyKey).slice(1)
      const connectionName = `${target.constructor.name}${capitalized}`

      // Create GQL Stuff
      const dynamicObjectFactory = Container.get(DynamicObjectFactory)
      const { Connection } = dynamicObjectFactory.makeEdgeConnection(connectionName, type, through)
      dynamicObjectFactory.declareFunctionAsRelayInSDL(target, getterName, propertyKey, Connection)

      // Create the actual Relay'd getter
      const ormConnection: () => new () => ORMConnection = Container.get('ORM_CONNECTION')
      const ORM = ormConnection()
      const orm = new ORM()

      target[getterName] = orm.autoRelayFactory(
        String(propertyKey),
        () => (target as new () => unknown),
        type,
        through as ClassValueThunk,
        options
      )
    })
  }
}

/**
 * Options while automatically fetching a connection
 */
export interface RelayedConnectionOptions<Entity=any> {
  /** how to order the returned results */
  order?: {
    [P in keyof Entity]?: "ASC" | "DESC" | 1 | -1;
  }; 
}
