describe('Basic worker communication', () => {
  it('Test basic communication with web worker', () => {
    cy.visit('/basic.html');
    cy.get('#test-res').should('have.text', 40);
  });
});
