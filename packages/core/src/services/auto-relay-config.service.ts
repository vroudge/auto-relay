import { SharedObjectFactory } from '../graphql/shared-object.factory'
import { Container, Service, Token } from 'typedi'
import { AutoRelayConfigArgs, AutoRelayConfigArgsExistingModel, AutoRelayConfigArgsNoModel, AutoRelayOrmConnect } from '../interfaces/auto-relay-config.interface'
import { ClassValueThunk } from '..'
import * as Relay from 'graphql-relay'

export const PREFIX = new Token<string>('PREFIX')
export const PAGINATION_OBJECT = new Token<ClassValueThunk<Relay.PageInfo>>('PAGINATION_OBJECT')
export const CONNECTIONARGS_OBJECT = new Token<ClassValueThunk<Relay.ConnectionArguments>>('CONNECTIONARGS_OBJECT')
export const ORM_CONNECTION = new Token<AutoRelayOrmConnect>('ORM_CONNECTION')

@Service()
export class AutoRelayConfig {

  protected static _sharedObjectFactory: SharedObjectFactory = Container.get(SharedObjectFactory)
  protected static _config: AutoRelayConfigArgs = {  } as any

  constructor(
    config: AutoRelayConfigArgs
  ) {
    if (!config) throw new Error(`No config supplied to AutoRelay`)
    Container.remove(PAGINATION_OBJECT, CONNECTIONARGS_OBJECT)

    this._registerOrm(config)

    if ((config as AutoRelayConfigArgsExistingModel).objects) {
      this._declareExistingObjects(config as AutoRelayConfigArgsExistingModel)
    } else {
      (config as AutoRelayConfigArgsNoModel).microserviceName = (config as AutoRelayConfigArgsNoModel).microserviceName ? String((config as AutoRelayConfigArgsNoModel).microserviceName) : ''
      if ( (config as AutoRelayConfigArgsNoModel).microserviceName) {
        (config as AutoRelayConfigArgsNoModel).microserviceName =  (config as AutoRelayConfigArgsNoModel).microserviceName![0].toUpperCase() +  (config as AutoRelayConfigArgsNoModel).microserviceName!.substring(1)
      }

      AutoRelayConfig.generateObjects(config, true)
      Container.set(PREFIX, (config as AutoRelayConfigArgsNoModel).microserviceName)
    }

    AutoRelayConfig._config = config
  }

  /**
   * Generate common Objects and make them available to auto-relay
   * @param prefix string to prefix the object's names with
   */
  public static generateObjects(config?: AutoRelayConfigArgsNoModel, force: boolean = false): void {
    config = config || AutoRelayConfig._config
    const alreadyExists = this.paginationExists()
    if (!alreadyExists || force) {
      const ConnectionArgs = this._sharedObjectFactory.generateConnectionArgs(config.microserviceName!)
      const PageInfo = this._sharedObjectFactory.generatePageInfo(config.microserviceName!, config.extends ? config.extends.pageInfo : undefined)

      Container.set(PAGINATION_OBJECT, (): typeof PageInfo => PageInfo)
      Container.set(CONNECTIONARGS_OBJECT, (): typeof ConnectionArgs => ConnectionArgs)
    }
  }

  /**
   * Checks if the pagination Object exists or not
   */
  protected static paginationExists() {
    let alreadyExists!: boolean;
    try {
      alreadyExists = Boolean(Container.get(PAGINATION_OBJECT))
    } catch (e) {
      alreadyExists = false;
    }
    return alreadyExists
  }

  protected _registerOrm(config: AutoRelayConfigArgs): void {
    if (!config.orm || typeof config.orm !== 'function') throw new Error(`config.orm must be a function`)
    Container.set(ORM_CONNECTION, config.orm)
  }

  protected _declareExistingObjects(config: AutoRelayConfigArgsExistingModel): void {
    Container.set(PAGINATION_OBJECT, config.objects.pageInfo)
    Container.set(CONNECTIONARGS_OBJECT, config.objects.connectionArgs)
  }

}
