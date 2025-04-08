
describe('Timeout task in worker', () => {
    it('Test timeout task in worker', () => {
      cy.visit('/timeout.html');
      cy.wait(2000)
      cy.get('#test-res').should('contain.text', 'Task exceeded');
    });
  });
  