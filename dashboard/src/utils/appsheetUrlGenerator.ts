/**
 * Genera URLs de AppSheet con filtros para diferentes vistas
 * Basado en la estructura de LINKTOFILTEREDVIEW de AppSheet
 */

interface AppSheetFilter {
  tableName: string;
  filterField: string;
  filterValue: string;
}

/**
 * Genera una URL de AppSheet con filtros
 * @param appId - ID de la aplicación AppSheet
 * @param filter - Configuración del filtro
 * @returns URL completa con filtros aplicados
 */
export function generateAppSheetUrl(appId: string, filter: AppSheetFilter): string {
  const baseUrl = `https://www.appsheet.com/start/${appId}`;
  
  // Crear un filtro simplificado pero funcional
  const filterObject = {
    EvalType: "BOOLEAN",
    OperatorName: "Equals",
    IsAtomic: true,
    IsSargable: true,
    SourceExpr: `[${filter.filterField}] :: ${filter.filterValue}`,
    Children: [
      {
        EvalType: "COLUMN",
        ColIndex: 2,
        ColName: filter.filterField,
        ContextLevel: 0,
        SourceExpr: `[${filter.filterField}]`,
        Children: [],
        ColumnsReferenced: [2],
        AncColumnsReferenced: [],
        TablesReferenced: [],
        ResultType: "Ref",
        ResultTypeQualifier: {
          ReferencedTableName: filter.tableName,
          ReferencedRootTableName: filter.tableName,
          ReferencedType: "Name",
          ReferencedKeyColumn: "Name",
          IsAPartOf: false,
          RelationshipName: null,
          InputMode: "Auto"
        },
        IsPure: true,
        MayBeExpensive: false,
        EagerEvalChildren: true
      },
      {
        EvalType: "CONSTANT",
        ConstantValue: filter.filterValue,
        SourceExpr: filter.filterValue,
        Children: [],
        ColumnsReferenced: [],
        AncColumnsReferenced: [],
        TablesReferenced: [],
        ResultType: "Ref",
        ResultTypeQualifier: {
          ReferencedTableName: filter.tableName,
          ReferencedRootTableName: filter.tableName,
          ReferencedType: "Name",
          ReferencedKeyColumn: "Name",
          IsAPartOf: false,
          RelationshipName: null,
          InputMode: "Auto"
        },
        IsPure: true,
        MayBeExpensive: false,
        EagerEvalChildren: true
      }
    ],
    ColumnsReferenced: [2],
    AncColumnsReferenced: [],
    TablesReferenced: [],
    ResultType: "Yes/No",
    ResultTypeQualifier: {
      YesLabel: "",
      NoLabel: ""
    },
    IsPure: true,
    MayBeExpensive: false,
    EagerEvalChildren: true
  };

  // Codificar el filtro
  const encodedFilter = encodeURIComponent(JSON.stringify(filterObject));
  
  // Construir la URL final
  const url = `${baseUrl}#control=${encodeURIComponent(filter.tableName)}&filter=${encodedFilter}`;
  
  return url;
}

/**
 * Genera una URL específica para Delivery Dockets filtrada por proyecto
 * @param projectName - Nombre del proyecto
 * @returns URL de AppSheet para Delivery Dockets
 */
export function generateDeliveryDocketsUrl(projectName: string): string {
  const appId = 'efcdb2a0-181f-4e43-bc65-6887dc279032'; // ID de la app de AppSheet
  
  return generateAppSheetUrl(appId, {
    tableName: 'Delivery Dockets',
    filterField: 'Project',
    filterValue: projectName
  });
}

/**
 * Genera una URL para cualquier tabla filtrada por proyecto
 * @param tableName - Nombre de la tabla en AppSheet
 * @param projectName - Nombre del proyecto
 * @returns URL de AppSheet para la tabla especificada
 */
export function generateTableUrl(tableName: string, projectName: string): string {
  const appId = 'efcdb2a0-181f-4e43-bc65-6887dc279032'; // ID de la app de AppSheet
  
  return generateAppSheetUrl(appId, {
    tableName: tableName,
    filterField: 'Project',
    filterValue: projectName
  });
}

/**
 * Versión alternativa más simple - solo para testing
 * Esta versión genera URLs más básicas que podrían funcionar
 */
export function generateSimpleAppSheetUrl(tableName: string): string {
  const appId = 'efcdb2a0-181f-4e43-bc65-6887dc279032';
  const baseUrl = `https://www.appsheet.com/start/${appId}`;
  
  // URL más simple sin filtros complejos
  return `${baseUrl}#control=${encodeURIComponent(tableName)}`;
} 