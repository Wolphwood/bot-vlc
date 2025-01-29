# ModalForm
A easy way to handle modal forms.

Then in your code 
```js
var ModalForm 	= require('./ModalForm');

let modal = new ModalForm({ title: "Modal de test" })
    .addRow()
    .addTextField({ name: 'fieldName', label: "input de test", placeholder: "placeholder" })
;

let result = await modal.setInteraction(interaction).popup();

console.log(result.get(fieldName));
```


# Documentation

## Contructor
>```js
>new ModalForm(options)
>```
>|parameter|type|optional|default|description|
>|:--:|:--:|:--:|:--:|:--:|
>|interaction|[BaseInteraction](https://discord.js.org/#/docs/discord.js/main/class/BaseInteraction)|Yes|`None`|Interaction on which to show modal.|
>|title|String|Yes|`\u200b`|Desc.|
>|translate|Boolean|Yes|`False`|Desc.|
>|translateKeys|Array|Yes|`None`|Desc.|
>|LangToUse|String|Yes|`default`|Desc.|

## .setInteraction([interaction](https://discord.js.org/#/docs/discord.js/main/class/BaseInteraction))
>### Set the interaction on wich to showup modal.
>Return : self
>&#x200b;

## .addRow()
>### Add ActionRow Component
>Return : self
>
>Examples :
>```js
>let modal = new ModalForm({...}).addRow();
>```
>&#x200b;

## .removeRow(index)
>### Remove a row.
>|parameter|type|optional|default|description|
>|:--:|:--:|:--:|:--:|:--:|
>|index|Number|Yes|Last row's index|Index of the row to delete.|
>
>Return : self
>
>Examples :
>```js
>let modal = new ModalForm({...})
>   .addRow()
>   .removeRow()
>;
>```
>&#x200b;

## .addComponents([components])
>### Remove a row.
>|parameter|type|optional|default|description|
>|:--:|:--:|:--:|:--:|:--:|
>|components|Array|No||List of components to add.<br>See DJs's doc|
>
>Return : self
>
>Examples :
>```js
>let modal = new ModalForm({...})
>   .addRow()
>   .addComponents([
>       { name: 'button1', type: ComponentType.Button, label: "Button1", style: ButtonStyle.Primary },
>       { name: 'button2', type: ComponentType.Button, label: "Button2", style: ButtonStyle.Secondary },
>       { name: 'button3', type: ComponentType.Button, label: "Button3", style: ButtonStyle.Danger }, 
>   ])
>;
>```
>&#x200b;

## .addTextField(options)
>### Add Short text input.
>|parameter|type|optional|default|description|
>|:--:|:--:|:--:|:--:|:--:|
>|name|String|Yes|`text`|Name of the field, usefull to find field in returned value|
>|label|String|No||Text input's label|
>|placeholder|String|No||Text placeholder's label|
>
>Return : self
>
>Examples :
>```js
>let modal = new ModalForm({...})
>   .addRow()
>   .addTextField({ name: "mytext", label: "Text", placeholder: "text here..." })
>;
>```
>&#x200b;

## .addParagraphField(options)
>### Add Paragraph text input.
>|parameter|type|optional|default|description|
>|:--:|:--:|:--:|:--:|:--:|
>|name|String|Yes|`paragraph`|Name of the field, usefull to find field in returned value|
>|label|String|No||Text input's label|
>|placeholder|String|No||Text placeholder's label|
>
>Return : self
>
>Examples :
>```js
>let modal = new ModalForm({...})
>   .addRow()
>   .addParagraphField({ name: "myparagraph", label: "Paragraph", placeholder: "text here..." })
>;
>```
>&#x200b;

## .addButton(options)
>### Add Paragraph text input.
>|parameter|type|optional|default|description|
>|:--:|:--:|:--:|:--:|:--:|
>|name|String|Yes|`button`|Name of the field, usefull to find field in returned value|
>|label|String|No||Button's label|
>|emoji|String|Yes|`None`|Button's Emoji|
>|style|String|No||Button's Style|
>
>Return : self
>
>Examples :
>```js
>let modal = new ModalForm({...})
>   .addRow()
>   .addButton({ name: "mybutton", label: "Button", style: ButtonStyle.Secondary })
>;
>```
>&#x200b;

# Not documented yet
> .setComponents()
> .removeComponents()
> .removeComponent()
> .clone()
> .popup()