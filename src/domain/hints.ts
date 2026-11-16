import { attackRoles, defenseRoles, receivers } from './formations';
import { backRowMiddle, frontRowMiddle, onCourt } from './lineup';
import { displayName } from './team';
import type { PlayerId, RoleId, SceneContext, Team } from './types';

const list = (names: string[]) =>
  names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;

/**
 * Spiegazione a parole di quello che si vede in campo, con i nomi della
 * squadra al posto dei ruoli quando ci sono.
 */
export function sceneHint(team: Team, ctx: SceneContext): string {
  const court = onCourt(ctx.rotation, ctx.situation, team.useLibero);
  /** Nome di chi gioca davvero in quel ruolo (il libero, se ha preso il posto del centrale). */
  const n = (role: RoleId): string => displayName(team, role === court.replaced ? 'L' : role);
  const z = (zone: 1 | 2 | 3 | 4 | 5 | 6): string => displayName(team, court.byZone[zone] as PlayerId);
  const ca = frontRowMiddle(ctx.rotation);
  const cd = backRowMiddle(ctx.rotation);

  switch (ctx.phase) {
    case 'base': {
      let hint = `Palleggiatore in posto ${ctx.rotation}. A rete ${list([z(4), z(3), z(2)])}; dietro ${list([z(5), z(6), z(1)])}.`;
      if (court.replaced) {
        hint += ` ${displayName(team, 'L')} gioca al posto di ${displayName(team, court.replaced)}.`;
      } else if (team.useLibero) {
        hint += ` ${displayName(team, cd)} è al servizio, quindi il libero resta fuori.`;
      }
      return hint;
    }

    case 'ricezione': {
      const names = receivers(ctx.rotation).map((slot) => (slot === 'CD' ? n(cd) : n(slot)));
      const who = `Ricevono ${list(names)}.`;
      switch (ctx.rotation) {
        case 1:
          return `${who} ${n('P')} parte dietro ${n('S1')} e sale a rete appena parte la battuta. ${n('O')} è in posto 4 e attacca da lì: il cambio con ${n('S1')} si fa a palla giocata.`;
        case 6:
          return `${who} ${n('P')} si nasconde dietro ${n('O')} e sale subito in zona di alzata.`;
        case 5:
          return `${who} ${n('P')} parte a sinistra dietro ${n(ca)} e attraversa il campo verso la zona di alzata.`;
        case 4:
          return `${who} ${n('P')} e ${n(ca)} si stringono a sinistra, così ${n('S2')} riceve a sinistra e poi attacca da posto 4. ${n('O')} resta dietro a destra, pronto per la seconda linea.`;
        case 3:
          return `${who} ${n('P')} è già a rete; ${n('O')} resta dietro, tra ${n(cd)} e ${n('S2')}.`;
        case 2:
          return `${who} ${n('P')} è già a rete a destra; ${n('O')} resta dietro a sinistra.`;
      }
      return who;
    }

    case 'attacco': {
      const roles = attackRoles(ctx.rotation);
      const pipe = n(roles.pipe!);
      if (roles.posto2) {
        return `${n('P')} alza venendo da dietro, quindi a rete ci sono tre attaccanti: ${n(roles.posto4!)} da posto 4, ${n(roles.centro!)} al centro e ${n(roles.posto2)} da posto 2. ${pipe} è pronto per la pipe.`;
      }
      return `${n('P')} è in prima linea, quindi a rete ci sono due attaccanti: ${n(roles.posto4!)} da posto 4 e ${n(roles.centro!)} al centro. ${n(roles.secondaLinea!)} attacca da seconda linea da posto 1, ${pipe} in pipe.`;
    }

    case 'battuta':
      return `Batte ${z(1)}. Gli altri restano in ordine di rotazione finché la palla non viene colpita, poi ognuno va al proprio posto di difesa.`;

    case 'contrattacco': {
      const d = defenseRoles(ctx.rotation);
      return d.DA === 'P'
        ? `${n('P')} alza da prima linea: ${n(d.SA)} attacca da posto 4 e ${n(d.CA)} al centro, ${n(d.DD)} da seconda linea da posto 1 e ${n(d.CD)} in pipe. ${n(d.SD)} copre l'attacco.`
        : `${n('P')} sale da dietro ad alzare: ${n(d.SA)} attacca da posto 4, ${n(d.CA)} al centro e ${n(d.DA)} da posto 2, con ${n(d.CD)} in pipe. ${n(d.SD)} copre l'attacco.`;
    }

    case 'difesa': {
      const d = defenseRoles(ctx.rotation);
      const arretrato = team.defenseSystem === 'arretrato';
      switch (ctx.attackFrom) {
        case 'freeball':
          return d.DA === 'P'
            ? `Palla facile dagli avversari: ${n('P')} resta a rete in zona di alzata, ${n(d.SA)} e ${n(d.CA)} si staccano per prendere la rincorsa. Ricevono ${list([n(d.SD), n(d.CD), n(d.DD)])}.`
            : `Palla facile dagli avversari: ${n('P')} sale da posto 1 in zona di alzata, ${list([n(d.SA), n(d.CA), n(d.DA)])} si staccano dalla rete per prendere la rincorsa. Ricevono ${list([n(d.SD), n(d.CD)])}.`;
        case 'attesa':
          return `Dopo il cambio ognuno gioca nel suo posto: ${n(d.SA)} in 4, ${n(d.CA)} in 3 e ${n(d.DA)} in 2; dietro ${n(d.SD)} in 5, ${n(d.CD)} in 6 e ${n(d.DD)} in 1.`;
        case 'da4':
          return arretrato
            ? `Muro a due con ${n(d.DA)} e ${n(d.CA)}; ${n(d.SA)} si stacca sui tre metri per la diagonale stretta. ${n(d.DD)} difende il lungolinea, ${n(d.SD)} la diagonale lunga, ${n(d.CD)} resta in fondo.`
            : `Muro a due con ${n(d.DA)} e ${n(d.CA)}; ${n(d.CD)} sale dietro il muro per i pallonetti. ${n(d.SA)} si stacca sulla diagonale stretta, ${n(d.DD)} e ${n(d.SD)} difendono lunghi.`;
        case 'da2':
          return arretrato
            ? `Muro a due con ${n(d.SA)} e ${n(d.CA)}; ${n(d.DA)} si stacca sui tre metri per la diagonale stretta. ${n(d.SD)} difende il lungolinea, ${n(d.DD)} la diagonale lunga, ${n(d.CD)} resta in fondo.`
            : `Muro a due con ${n(d.SA)} e ${n(d.CA)}; ${n(d.CD)} sale dietro il muro per i pallonetti. ${n(d.DA)} si stacca sulla diagonale stretta, ${n(d.SD)} e ${n(d.DD)} difendono lunghi.`;
        case 'da3':
          return arretrato
            ? `${n(d.CA)} a muro sul primo tempo, ${n(d.SA)} e ${n(d.DA)} chiudono ai lati. ${n(d.SD)} e ${n(d.DD)} stringono verso il centro, ${n(d.CD)} resta in fondo.`
            : `${n(d.CA)} a muro sul primo tempo, ${n(d.SA)} e ${n(d.DA)} chiudono ai lati. ${n(d.CD)} sale dietro il muro, ${n(d.SD)} e ${n(d.DD)} difendono lunghi.`;
      }
    }
  }
}
