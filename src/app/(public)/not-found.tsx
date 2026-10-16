import { Button, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="narrow">
      <EmptyState
        title="This page isn't here"
        actions={
          <>
            <Button variant="secondary" href="/roasters">
              Browse roasters
            </Button>
            <Button href="/">See all shops</Button>
          </>
        }
      >
        The shop may have closed or moved, or the link has a typo.
      </EmptyState>
    </div>
  );
}
