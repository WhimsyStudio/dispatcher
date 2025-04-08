describe('Event parameter in web worker', () => {
    it('Test event parameter in web worker', () => {
      cy.visit('/parameter.html');
      cy.get('#test-res').should('have.text', 2);
      cy.get('#test-res1').should('have.text', 'OK');
    });
  });
  