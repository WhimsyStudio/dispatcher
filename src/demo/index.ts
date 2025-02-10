import MyLibrary from "../lib";
const myLibraryInstance = new MyLibrary();

document.body.innerHTML = `<h1>Hello World!</h1>`;

console.log("myLibraryInstance", myLibraryInstance);

myLibraryInstance.myMethod();
