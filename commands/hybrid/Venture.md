# Venture

## Présentation
**Venture** est un système d'histoires à choix intégrant une dimension RPG, combinant narration interactive, gestion d'inventaire et statistiques.  
Il permet de créer des aventures où les décisions des joueurs influencent l'évolution de l'histoire, tout en offrant des mécaniques de jeu telles que la gestion des ressources et des compétences.  
Ce mélange unique entre récit et gameplay rend Venture idéal pour des expériences immersives et personnalisées.  

## Structure
La structure des Ventures est pensée pour être facilement utilisée à travers les supports.  
Attention cependant aux limitations des plateformes et/ou supports utilisés.  

La structure est pensée au format JSON ou Objet Javascript.  

### Structure Générale
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| name | Nom du jeu | `String` | ❌ |
| authors | Liste des auteurs | [`VentureAuthor[]`](#author) | ✅ |
| version | Version du jeu | `String` `Number` | ✅ |
| tags | Tags | `String[]` | ❌ |
| presentation | Présentation de la venture (clé de traduction `venture.presentation` si traduction disponible) | `String` | ❌ |
| procedures | Procedures | [`VentureProcedure[]`](#ventureprocedure) | ❌ |
| initialization | Initialization | [`VentureInitialization`](#ventureinitialization) | ❌ |
| situations | Situations | [`VentureSituation[]`](#venturesituation) | ❌ |
| translated | Traduction activée | `Boolean` | ✅ |
| translations | Données de traduction | `Object<Key:String` `Number` `String[]` `Number[]>` | ✅ |

---

## Author
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| name | Nom de l'auteur•ice | `String` | ❌ |
| contact | Liens de l'auteur•ice | `Object<Key:String>` | ✅ |

### Author Links
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| mail | Adresse mail | `String` | ✅ |
| website | URL | `String` | ✅ |
| twitter | Profil Twitter | `String` | ✅ |
| bsky | Profil BlueSky | `String` | ✅ |
| instagram | Profil Instagram | `String` | ✅ |
| discord | ID Discord | `String` | ✅ |

---

# VentureInitialization  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| situation | ID de la situation de départ | `String` | ❌ |
| stats | Statistiques initiales | `Object<Key:Number` `Range>` | ✅ |
| inventory | Inventaire initial | `Object<Key:Number` `Range>` | ✅ |
| variable | Variables initiales | `Object<Key:Number` `Range>` | ✅ |

---

# VentureProcedure  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| id | ID de la procédure | `String` | ❌ |
| requirements | Pré-requis pour autoriser la procédure à s'exécuter | [`ExpressionString`](#expressionstring)` `[`VentureRequirement[]`](#venturerequirement) | ✅ |
| actions | Actions à effectuer | [`VentureAction[]`](#ventureaction) | ❌ |

---

# VentureSituation  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| id | ID de la situation | `String` | ❌ |
| description | Description de la situation | `String` | ❌ |
| image | Informations sur l'image | [`VentureImage`](#ventureimage) | ✅ |
| options | Liste des options disponibles | [`VentureSituationOption[]`](#venturesituationoption) | ❌ |

---

## VentureSituationOption
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| actions | Actions liées à l'option | [`VentureAction[]`](#ventureaction) | ✅ |
| requirements | Pré-requis pour autoriser l'option | [`ExpressionString`](#expressionstring)` `[`VentureRequirement[]`](#venturerequirement) | ✅ |
| procedures | Liste des procédures à exécuter pour l'option | [`VentureProcedure[]`](#ventureprocedure) | ✅ |
| hidden | Conditions pour cacher l'option | [`ExpressionString`](#expressionstring)` `[`VentureRequirement[]`](#venturerequirement) | ✅ |

---

# VentureImage  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| url | URL de l'image | `String` | ✅ |
| base64 | Image encodée en base64 | `String` | ✅ |
| file | Fichier local de l'image | `String` | ✅ |  
_Priorité `URL > FILE > BASE64`_

---

# VentureRequirement  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| type | Type de la condition | `"AND"` `"OR"` `"comparison"` | ❌ |

### VentureRequirement AND/OR
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| requirements | Liste des pré-requis imbriqués pour cette condition | [`ExpressionString`](#expressionstring)` `[`VentureRequirement[]`](#venturerequirement) | ❌ |

### VentureRequirement Comparison
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| left | Valeur ou expression à gauche de la comparaison | `String` `Number` `Range` | ❌ |
| right | Valeur ou expression à droite de la comparaison | `String` `Number` `Range` | ❌ |
| operator | Opérateur de comparaison | [`Operator`](#operator) | ❌ (default: "set") |
| precision | Précision numérique pour la comparaison | `Number` | ✅ |
| round | Méthode d'arrondi pour la comparaison | `"round"` `"ceil"` `"floor"` | ✅ |

---

# VentureAction  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| type | Type d'action | `"inventory"` `"condition"` `"stat"` `"goto"` `"variable"` `"procedure"` `"reward"` | ❌ |
| conditions | Conditions pour autoriser l'exécution de l'action | [`ExpressionString`](#expressionstring)` `[`VentureRequirement[]`](#venturerequirement) | ✅ |

### VentureAction Inventory
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| item | Nom ou ID de l'objet | `String` | ❌ |
| count | Quantité de l'objet | `Number` `Range` | ✅ (default: 1) |
| action | Type d'action sur l'inventaire | `"set"` `"add"` `"remove"` | ✅ (default: "add") |

### VentureAction Condition
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| requirements | Conditions pour déterminer le résultat | [`ExpressionString`](#expressionstring)` `[`VentureRequirement[]`](#venturerequirement) | ❌ |
| success | Actions à exécuter en cas de succès | [`VentureAction[]`](#ventureaction) | ❌ |
| fail | Actions à exécuter en cas d'échec | [`VentureAction[]`](#ventureaction) | ❌ |

### VentureAction Stat
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| name | Nom ou ID de la statistique | `String` | ❌ |
| value | Valeur ou plage de la modification | `Number` `Range` | ❌ |
| operator | Opérateur pour la modification | [`Operator`](#operator) | ✅ (default: "set") |
| precision | Précision numérique pour la modification | `Number` | ✅ |
| round | Méthode d'arrondi pour la modification | `"round"` `"ceil"` `"floor"` | ✅ |

---

# ExpressionString
1. **Opérateurs logiques** : && (AND), || (OR)

2. **Opérateurs de comparaison** : ==, !=, <, >, <=, >=, includes

3. **Opérateurs arithmétiques** : +, -, *, /, %

4. **Fonctions mathématiques** : round, ceil, floor, pow, sqrt

5. **Valeurs et variables** :
   - **Constantes numériques** (10, 3.14)
   - **Variables du système** (stat.name, inventory.itemname, variable.key)
   
6. **Parenthèses** : Pour regrouper des sous-expressions et gérer la priorité.

---

# Operator  
| Nom | Description |
|-|-|
| set | Définit une valeur |
| add | Ajoute une valeur |
| remove | Soustrait une valeur |
| multiply | Multiplie une valeur |
| divide | Divise une valeur |
| modulo | Calcule le reste de la division |
| power | Élévation à une puissance |
| sqrt | Calcule la racine carrée |

---

# Range  
| Nom | Description | Type | Optionnel |
|-|-|-|-|
| min | Valeur minimale du champ | `Number` | ❌ |
| max | Valeur maximale du champ | `Number` | ❌ |
| precision | Nombre de décimales pour les valeurs générées | `Number` | ✅ |
| round | Méthode d'arrondi pour la plage de valeurs | `"round"` `"ceil"` `"floor"` | ✅ |